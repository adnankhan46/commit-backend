import { Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { createBullMQConnection } from "../../config/redis.js";
import { QUEUE_NAMES, getSendNotificationsQueue } from "../../config/queue.js";
import db from "../../db/index.js";
import { commitments, dailyCommitmentRows } from "../../db/schema/index.js";
import { verifyHabitImage } from "../../services/groq.service.js";
import { releaseFunds } from "../wallet/wallet.service.js";
import { applyPenalty } from "./penalty.helper.js";
import logger from "../../utils/logger.js";

const MAX_RETRIES = 5;

async function enqueuePush(
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  const queue = getSendNotificationsQueue();
  await queue.add("push", { userIds, title, body, data });
}

export function createStoryVerifyWorker() {
  return new Worker(
    QUEUE_NAMES.STORY_VERIFY,
    async (job) => {
      const { rowId, imageUrl, habitTitle, habitPrompt } = job.data as {
        rowId: string;
        imageUrl: string;
        habitTitle: string;
        habitPrompt?: string | null;
      };

      const rowRows = await db
        .select()
        .from(dailyCommitmentRows)
        .where(eq(dailyCommitmentRows.id, rowId))
        .limit(1);

      if (rowRows.length === 0) {
        logger.warn(`[StoryVerify]: Row ${rowId} not found, skipping`);
        return;
      }

      const row = rowRows[0]!;

      // Idempotency — skip if already resolved
      if (row.status === "verified" || row.status === "failed") {
        logger.info(`[StoryVerify]: Row ${rowId} already ${row.status}, skipping`);
        return;
      }

      const result = await verifyHabitImage(imageUrl, habitTitle, habitPrompt);

      if (result.approved) {
        // Fetch daily stake
        const commitmentRows = await db
          .select({ dailyStake: commitments.dailyStake })
          .from(commitments)
          .where(eq(commitments.id, row.commitmentId))
          .limit(1);

        await db
          .update(dailyCommitmentRows)
          .set({ status: "verified", aiVerified: true, verifiedAt: new Date() })
          .where(eq(dailyCommitmentRows.id, rowId));

        if (commitmentRows.length > 0) {
          await releaseFunds(
            row.userId,
            parseFloat(commitmentRows[0]!.dailyStake),
            rowId,
            "Daily check-in verified"
          );
        }

        await enqueuePush(
          [row.userId],
          "✅ Verified!",
          `Your habit check-in was approved.`,
          { rowId, commitmentId: row.commitmentId }
        );

        logger.info(`[StoryVerify]: Row ${rowId} verified`);
      } else {
        const newRetryCount = row.retryCount + 1;

        if (newRetryCount >= MAX_RETRIES) {
          await db
            .update(dailyCommitmentRows)
            .set({ status: "failed", aiVerified: false, retryCount: newRetryCount })
            .where(eq(dailyCommitmentRows.id, rowId));

          await applyPenalty({ ...row, retryCount: newRetryCount });

          await enqueuePush(
            [row.userId],
            "❌ Check-in Failed",
            `5 attempts exhausted. Points deducted. Reason: ${result.reason}`,
            { rowId, commitmentId: row.commitmentId }
          );

          logger.info(`[StoryVerify]: Row ${rowId} failed after ${MAX_RETRIES} retries`);
        } else {
          // Reset to pending so user can resubmit a new image
          await db
            .update(dailyCommitmentRows)
            .set({ status: "pending", aiVerified: false, retryCount: newRetryCount })
            .where(eq(dailyCommitmentRows.id, rowId));

          const remaining = MAX_RETRIES - newRetryCount;
          await enqueuePush(
            [row.userId],
            "⚠️ Verification Failed",
            `${result.reason}. ${remaining} retr${remaining === 1 ? "y" : "ies"} left — try a clearer photo.`,
            { rowId, commitmentId: row.commitmentId, retriesLeft: remaining }
          );

          logger.info(
            `[StoryVerify]: Row ${rowId} rejected (attempt ${newRetryCount}/${MAX_RETRIES})`
          );
        }
      }
    },
    { connection: createBullMQConnection() }
  );
}
