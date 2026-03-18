import { Worker } from "bullmq";
import { and, eq, inArray, lt } from "drizzle-orm";
import { createBullMQConnection } from "../../config/redis.js";
import { QUEUE_NAMES, getSendNotificationsQueue } from "../../config/queue.js";
import db from "../../db/index.js";
import { dailyCommitmentRows } from "../../db/schema/index.js";
import { applyPenalty } from "./penalty.helper.js";
import logger from "../../utils/logger.js";

export function createProcessFailuresWorker() {
  return new Worker(
    QUEUE_NAMES.PROCESS_FAILURES,
    async () => {
      const overdueRows = await db
        .select()
        .from(dailyCommitmentRows)
        .where(
          and(
            lt(dailyCommitmentRows.deadline, new Date()),
            inArray(dailyCommitmentRows.status, ["pending", "submitted"])
          )
        );

      if (overdueRows.length === 0) return;

      logger.info(`[ProcessFailures]: Processing ${overdueRows.length} overdue row(s)`);

      const notifyQueue = getSendNotificationsQueue();

      for (const row of overdueRows) {
        // Mark failed
        await db
          .update(dailyCommitmentRows)
          .set({ status: "failed" })
          .where(eq(dailyCommitmentRows.id, row.id));

        // Apply penalty
        await applyPenalty(row);

        // Notify user
        await notifyQueue.add("push", {
          userIds: [row.userId],
          title: "😔 Missed Check-in",
          body: "You missed today's check-in deadline. Points have been deducted.",
          data: { rowId: row.id, commitmentId: row.commitmentId },
        });
      }

      logger.info(`[ProcessFailures]: Processed ${overdueRows.length} overdue row(s)`);
    },
    { connection: createBullMQConnection() }
  );
}
