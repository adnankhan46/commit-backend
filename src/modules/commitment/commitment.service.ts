import { and, desc, eq, inArray } from "drizzle-orm";
import { DateTime } from "luxon";
import db from "../../db/index.js";
import {
  commitmentPartners,
  commitments,
  dailyCommitmentRows,
  users,
} from "../../db/schema/index.js";
import { getStoryVerifyQueue } from "../../config/queue.js";
import cloudinary from "../../config/cloudinary.js";
import {
  getAvailableBalance,
  holdFunds,
  releaseFunds,
} from "../wallet/wallet.service.js";
import type { CreateCommitmentDTO } from "./commitment.validator.js";
import logger from "../../utils/logger.js";

export async function createCommitment(creatorId: string, dto: CreateCommitmentDTO) {
  const {
    title, description, habitPrompt, dailyStake, payoutType,
    startDate, endDate, checkinHourIst, deadlineHourIst, partnerIds,
  } = dto;

  // Validate partners exist (excluding creator — they're added automatically)
  const partnerRows = await db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.id, partnerIds));

  if (partnerRows.length !== partnerIds.length) {
    throw new Error("One or more partner IDs are invalid.");
  }

  const allParticipantIds = [creatorId, ...partnerIds];

  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const totalHold = dailyStake * totalDays;

  // Check all participants have enough balance — abort if any fail
  for (const uid of allParticipantIds) {
    const available = await getAvailableBalance(uid);
    if (available < totalHold) {
      const isCreator = uid === creatorId;
      throw new Error(
        `${isCreator ? "You have" : "A partner has"} insufficient balance. Need ${totalHold} points, available: ${available.toFixed(2)}.`
      );
    }
  }

  const commitmentRows = await db
    .insert(commitments)
    .values({
      creatorId,
      title,
      description: description ?? null,
      habitPrompt: habitPrompt ?? null,
      dailyStake: dailyStake.toFixed(2),
      payoutType,
      status: "active",
      startDate,
      endDate,
      checkinHourIst,
      deadlineHourIst,
    })
    .returning();

  const commitment = commitmentRows[0]!;

  await db.insert(commitmentPartners).values([
    { commitmentId: commitment.id, userId: creatorId, role: "creator" },
    ...partnerIds.map((uid) => ({ commitmentId: commitment.id, userId: uid, role: "partner" })),
  ]);

  for (const uid of allParticipantIds) {
    await holdFunds(uid, totalHold, commitment.id, `Commitment stake: ${title}`);
  }

  logger.info(`[Commitment]: Created ${commitment.id} by ${creatorId}, ${allParticipantIds.length} participants, ${totalDays} days`);
  return commitment;
}

export async function getMyCommitments(userId: string) {
  const memberships = await db
    .select({ commitmentId: commitmentPartners.commitmentId })
    .from(commitmentPartners)
    .where(eq(commitmentPartners.userId, userId));

  if (memberships.length === 0) return [];

  const ids = memberships.map((r) => r.commitmentId);
  return db
    .select()
    .from(commitments)
    .where(inArray(commitments.id, ids))
    .orderBy(desc(commitments.createdAt));
}

export async function getCommitmentById(commitmentId: string, userId: string) {
  const membership = await db
    .select()
    .from(commitmentPartners)
    .where(
      and(
        eq(commitmentPartners.commitmentId, commitmentId),
        eq(commitmentPartners.userId, userId)
      )
    )
    .limit(1);

  if (membership.length === 0) throw new Error("You are not a member of this commitment.");

  const commitmentRows = await db
    .select()
    .from(commitments)
    .where(eq(commitments.id, commitmentId))
    .limit(1);

  if (commitmentRows.length === 0) throw new Error("Commitment not found.");

  const partners = await db
    .select({
      id: commitmentPartners.id,
      userId: commitmentPartners.userId,
      role: commitmentPartners.role,
      email: users.email,
    })
    .from(commitmentPartners)
    .innerJoin(users, eq(commitmentPartners.userId, users.id))
    .where(eq(commitmentPartners.commitmentId, commitmentId));

  const today = DateTime.now().setZone("Asia/Kolkata").toFormat("yyyy-MM-dd");
  const todayRow = await db
    .select()
    .from(dailyCommitmentRows)
    .where(
      and(
        eq(dailyCommitmentRows.commitmentId, commitmentId),
        eq(dailyCommitmentRows.userId, userId),
        eq(dailyCommitmentRows.date, today)
      )
    )
    .limit(1);

  return {
    ...commitmentRows[0]!,
    partners,
    todayRow: todayRow[0] ?? null,
  };
}

export async function cancelCommitment(commitmentId: string, userId: string) {
  const commitmentRows = await db
    .select()
    .from(commitments)
    .where(eq(commitments.id, commitmentId))
    .limit(1);

  if (commitmentRows.length === 0) throw new Error("Commitment not found.");
  const commitment = commitmentRows[0]!;

  if (commitment.creatorId !== userId) throw new Error("Only the creator can cancel a commitment.");
  if (commitment.status !== "active") throw new Error("Only active commitments can be cancelled.");

  const partners = await db
    .select({ userId: commitmentPartners.userId })
    .from(commitmentPartners)
    .where(eq(commitmentPartners.commitmentId, commitmentId));

  const dailyStake = parseFloat(commitment.dailyStake);
  const start = new Date(commitment.startDate);
  const end = new Date(commitment.endDate);
  const totalDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  for (const { userId: uid } of partners) {
    const processedRows = await db
      .select({ id: dailyCommitmentRows.id })
      .from(dailyCommitmentRows)
      .where(
        and(
          eq(dailyCommitmentRows.commitmentId, commitmentId),
          eq(dailyCommitmentRows.userId, uid),
          inArray(dailyCommitmentRows.status, ["verified", "failed"])
        )
      );

    const remainingDays = totalDays - processedRows.length;
    if (remainingDays > 0) {
      await releaseFunds(uid, dailyStake * remainingDays, commitmentId, "Commitment cancelled");
    }
  }

  await db
    .update(commitments)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(commitments.id, commitmentId));

  logger.info(`[Commitment]: Cancelled ${commitmentId} by ${userId}`);
}

export async function getCommitmentRows(
  commitmentId: string,
  userId: string,
  filterUserId?: string,
  filterDate?: string
) {
  const membership = await db
    .select()
    .from(commitmentPartners)
    .where(
      and(
        eq(commitmentPartners.commitmentId, commitmentId),
        eq(commitmentPartners.userId, userId)
      )
    )
    .limit(1);

  if (membership.length === 0) throw new Error("You are not a member of this commitment.");

  const conditions = [eq(dailyCommitmentRows.commitmentId, commitmentId)];
  if (filterUserId) conditions.push(eq(dailyCommitmentRows.userId, filterUserId));
  if (filterDate) conditions.push(eq(dailyCommitmentRows.date, filterDate));

  return db
    .select()
    .from(dailyCommitmentRows)
    .where(and(...conditions))
    .orderBy(desc(dailyCommitmentRows.date));
}

export async function submitStory(
  commitmentId: string,
  rowId: string,
  userId: string,
  file: Express.Multer.File
) {
  const rowRows = await db
    .select()
    .from(dailyCommitmentRows)
    .where(eq(dailyCommitmentRows.id, rowId))
    .limit(1);

  if (rowRows.length === 0) throw new Error("Daily row not found.");
  const row = rowRows[0]!;

  if (row.commitmentId !== commitmentId) throw new Error("Row does not belong to this commitment.");
  if (row.userId !== userId) throw new Error("This row does not belong to you.");
  if (row.status === "verified") throw new Error("Already verified for today.");
  if (row.status === "failed") throw new Error("This day has already failed.");
  if (row.retryCount >= 5) throw new Error("Maximum retries (5) reached.");
  if (new Date() > new Date(row.deadline)) throw new Error("Submission deadline has passed.");

  const commitmentRows = await db
    .select()
    .from(commitments)
    .where(eq(commitments.id, commitmentId))
    .limit(1);

  if (commitmentRows.length === 0) throw new Error("Commitment not found.");
  const commitment = commitmentRows[0]!;

  // Upload to Cloudinary
  const uploadResult = await new Promise<{ secure_url: string; public_id: string }>(
    (resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: `commit-stories/${commitmentId}`, resource_type: "image" },
        (error, result) => {
          if (error || !result) return reject(error ?? new Error("Cloudinary upload failed"));
          resolve({ secure_url: result.secure_url, public_id: result.public_id });
        }
      );
      stream.end(file.buffer);
    }
  );

  await db
    .update(dailyCommitmentRows)
    .set({
      storyImageUrl: uploadResult.secure_url,
      storyImagePublicId: uploadResult.public_id,
      status: "submitted",
      submittedAt: new Date(),
    })
    .where(eq(dailyCommitmentRows.id, rowId));

  const queue = getStoryVerifyQueue();
  await queue.add("verify", {
    rowId,
    imageUrl: uploadResult.secure_url,
    habitTitle: commitment.title,
    habitPrompt: commitment.habitPrompt,
  });

  logger.info(`[Story]: Submitted for row ${rowId}, enqueued AI verification`);
  return { message: "Story submitted. AI verification in progress." };
}
