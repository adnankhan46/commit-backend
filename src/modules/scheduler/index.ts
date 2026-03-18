import cron from "node-cron";
import { and, eq, inArray, lt } from "drizzle-orm";
import { DateTime } from "luxon";
import db from "../../db/index.js";
import { commitmentPartners, commitments, dailyCommitmentRows } from "../../db/schema/index.js";
import { getDailyRowsQueue, getProcessFailuresQueue } from "../../config/queue.js";
import { releaseFunds } from "../wallet/wallet.service.js";
import logger from "../../utils/logger.js";

export function startScheduler() {
  // ─── Cron 1: Every hour — generate daily rows ───────────────────────────
  // Runs at minute 0 of every hour. Finds active commitments whose checkinHourIst
  // matches current IST hour, enqueues a daily-rows job for each.
  cron.schedule("0 * * * *", async () => {
    try {
      const nowIst = DateTime.now().setZone("Asia/Kolkata");
      const currentHour = nowIst.hour;
      const todayDate = nowIst.toFormat("yyyy-MM-dd");

      const dueCommitments = await db
        .select()
        .from(commitments)
        .where(
          and(
            eq(commitments.status, "active"),
            eq(commitments.checkinHourIst, currentHour)
          )
        );

      if (dueCommitments.length === 0) return;

      const queue = getDailyRowsQueue();
      for (const commitment of dueCommitments) {
        if (commitment.startDate <= todayDate && commitment.endDate >= todayDate) {
          await queue.add("generate", { commitmentId: commitment.id, date: todayDate });
        }
      }

      logger.info(
        `[Scheduler]: Enqueued ${dueCommitments.length} daily-row job(s) for IST hour ${currentHour}`
      );
    } catch (err) {
      logger.error(`[Scheduler]: Daily rows cron error: ${err}`);
    }
  });

  // ─── Cron 2: Every 5 minutes — process overdue rows ─────────────────────
  // Finds rows past their deadline that are still pending/submitted and
  // triggers the process-failures worker.
  cron.schedule("*/5 * * * *", async () => {
    try {
      const overdue = await db
        .select({ id: dailyCommitmentRows.id })
        .from(dailyCommitmentRows)
        .where(
          and(
            lt(dailyCommitmentRows.deadline, new Date()),
            inArray(dailyCommitmentRows.status, ["pending", "submitted"])
          )
        );

      if (overdue.length === 0) return;

      const queue = getProcessFailuresQueue();
      await queue.add("process", {});
      logger.info(
        `[Scheduler]: Enqueued process-failures job (${overdue.length} overdue row(s) detected)`
      );
    } catch (err) {
      logger.error(`[Scheduler]: Process failures cron error: ${err}`);
    }
  });

  // ─── Cron 3: Daily at midnight IST (18:30 UTC) — complete commitments ───
  // Marks commitments past their endDate as "completed" and releases
  // any remaining holds.
  cron.schedule("30 18 * * *", async () => {
    try {
      const nowIst = DateTime.now().setZone("Asia/Kolkata").toFormat("yyyy-MM-dd");

      const expiredCommitments = await db
        .select()
        .from(commitments)
        .where(and(eq(commitments.status, "active"), lt(commitments.endDate, nowIst)));

      for (const commitment of expiredCommitments) {
        const partners = await db
          .select({ userId: commitmentPartners.userId })
          .from(commitmentPartners)
          .where(eq(commitmentPartners.commitmentId, commitment.id));

        const dailyStake = parseFloat(commitment.dailyStake);
        const start = new Date(commitment.startDate);
        const end = new Date(commitment.endDate);
        const totalDays =
          Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        for (const { userId } of partners) {
          const processedRows = await db
            .select({ id: dailyCommitmentRows.id })
            .from(dailyCommitmentRows)
            .where(
              and(
                eq(dailyCommitmentRows.commitmentId, commitment.id),
                eq(dailyCommitmentRows.userId, userId),
                inArray(dailyCommitmentRows.status, ["verified", "failed"])
              )
            );

          const remainingDays = totalDays - processedRows.length;
          if (remainingDays > 0) {
            await releaseFunds(
              userId,
              dailyStake * remainingDays,
              commitment.id,
              "Commitment completed"
            );
          }
        }

        await db
          .update(commitments)
          .set({ status: "completed", updatedAt: new Date() })
          .where(eq(commitments.id, commitment.id));
      }

      if (expiredCommitments.length > 0) {
        logger.info(`[Scheduler]: Completed ${expiredCommitments.length} commitment(s)`);
      }
    } catch (err) {
      logger.error(`[Scheduler]: Commitment completion cron error: ${err}`);
    }
  });

  logger.info("[Scheduler]: All cron jobs started (hourly rows, 5-min failures, midnight completion)");
}
