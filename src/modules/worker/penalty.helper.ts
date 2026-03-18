import { and, eq, ne } from "drizzle-orm";
import db from "../../db/index.js";
import { commitments, commitmentPartners, users } from "../../db/schema/index.js";
import { penaltyDebit, penaltyCredit } from "../wallet/wallet.service.js";
import logger from "../../utils/logger.js";
import type { DailyCommitmentRow } from "../../db/schema/commitments.js";

export async function applyPenalty(row: DailyCommitmentRow): Promise<void> {
  const commitmentRows = await db
    .select()
    .from(commitments)
    .where(eq(commitments.id, row.commitmentId))
    .limit(1);

  if (commitmentRows.length === 0) {
    logger.error(`[Penalty]: Commitment ${row.commitmentId} not found`);
    return;
  }

  const commitment = commitmentRows[0]!;
  const dailyStake = parseFloat(commitment.dailyStake);

  if (commitment.payoutType === "donate") {
    const adminRows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.isAdmin, true))
      .limit(1);

    if (adminRows.length === 0) {
      logger.error("[Penalty]: No admin user found for donate payout");
      return;
    }

    await penaltyDebit(row.userId, dailyStake, row.id);
    await penaltyCredit(adminRows[0]!.id, dailyStake, row.id);
    logger.info(`[Penalty]: Donated ${dailyStake} from ${row.userId} to admin`);
  } else {
    // Split equally among all other active partners
    const otherPartners = await db
      .select({ userId: commitmentPartners.userId })
      .from(commitmentPartners)
      .where(
        and(
          eq(commitmentPartners.commitmentId, row.commitmentId),
          ne(commitmentPartners.userId, row.userId)
        )
      );

    if (otherPartners.length === 0) {
      // Fallback: no other partners, donate to admin
      const adminRows = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.isAdmin, true))
        .limit(1);

      if (adminRows.length > 0) {
        await penaltyDebit(row.userId, dailyStake, row.id);
        await penaltyCredit(adminRows[0]!.id, dailyStake, row.id);
      }
      return;
    }

    const splitAmount = dailyStake / otherPartners.length;
    await penaltyDebit(row.userId, dailyStake, row.id);

    for (const { userId: partnerId } of otherPartners) {
      await penaltyCredit(partnerId, splitAmount, row.id);
    }

    logger.info(
      `[Penalty]: Split ${dailyStake} from ${row.userId} among ${otherPartners.length} partner(s) (${splitAmount.toFixed(2)} each)`
    );
  }
}
