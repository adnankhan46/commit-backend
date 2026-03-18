import { Worker } from "bullmq";
import { and, eq } from "drizzle-orm";
import { DateTime } from "luxon";
import { createBullMQConnection } from "../../config/redis.js";
import { QUEUE_NAMES, getSendNotificationsQueue } from "../../config/queue.js";
import db from "../../db/index.js";
import { commitmentPartners, commitments, dailyCommitmentRows } from "../../db/schema/index.js";
import logger from "../../utils/logger.js";

export function createDailyRowsWorker() {
  return new Worker(
    QUEUE_NAMES.DAILY_ROWS,
    async (job) => {
      const { commitmentId, date } = job.data as { commitmentId: string; date: string };

      const commitmentRows = await db
        .select()
        .from(commitments)
        .where(eq(commitments.id, commitmentId))
        .limit(1);

      if (commitmentRows.length === 0) return;
      const commitment = commitmentRows[0]!;

      if (commitment.status !== "active") return;

      // Build deadline timestamp: deadlineHourIst on that date in IST
      const deadline = DateTime.fromISO(date, { zone: "Asia/Kolkata" })
        .set({ hour: commitment.deadlineHourIst, minute: 0, second: 0, millisecond: 0 })
        .toJSDate();

      const partners = await db
        .select({ userId: commitmentPartners.userId })
        .from(commitmentPartners)
        .where(eq(commitmentPartners.commitmentId, commitmentId));

      const notifyUserIds: string[] = [];

      for (const { userId } of partners) {
        // Idempotency — skip if row already exists for this user/date
        const existing = await db
          .select({ id: dailyCommitmentRows.id })
          .from(dailyCommitmentRows)
          .where(
            and(
              eq(dailyCommitmentRows.commitmentId, commitmentId),
              eq(dailyCommitmentRows.userId, userId),
              eq(dailyCommitmentRows.date, date)
            )
          )
          .limit(1);

        if (existing.length > 0) continue;

        await db.insert(dailyCommitmentRows).values({
          commitmentId,
          userId,
          date,
          status: "pending",
          deadline,
          retryCount: 0,
        });

        notifyUserIds.push(userId);
      }

      if (notifyUserIds.length > 0) {
        const queue = getSendNotificationsQueue();
        await queue.add("push", {
          userIds: notifyUserIds,
          title: "📸 Time to check in!",
          body: `Snap your proof for "${commitment.title}" before ${commitment.deadlineHourIst}:00 IST.`,
          data: { commitmentId },
        });
      }

      logger.info(
        `[DailyRows]: Generated ${notifyUserIds.length} row(s) for commitment ${commitmentId} on ${date}`
      );
    },
    { connection: createBullMQConnection() }
  );
}
