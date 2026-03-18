import { eq, sql, desc } from "drizzle-orm";
import db from "../../db/index.js";
import { wallets, walletTransactions } from "../../db/schema/index.js";
import type { TxType } from "../../db/schema/wallets.js";
import logger from "../../utils/logger.js";

export async function getWalletByUserId(userId: string) {
  const result = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
  return result[0] ?? null;
}

export async function getAvailableBalance(userId: string): Promise<number> {
  const wallet = await getWalletByUserId(userId);
  if (!wallet) return 0;
  return parseFloat(wallet.balance) - parseFloat(wallet.holdBalance);
}

export async function creditWallet(
  userId: string,
  amount: number,
  referenceId: string | null,
  description: string
): Promise<void> {
  const wallet = await getWalletByUserId(userId);
  if (!wallet) throw new Error(`Wallet not found for user ${userId}`);

  await db
    .update(wallets)
    .set({
      balance: sql`${wallets.balance} + ${amount.toFixed(2)}`,
      updatedAt: new Date(),
    })
    .where(eq(wallets.userId, userId));

  await recordTransaction(wallet.id, "credit", amount, referenceId, description);
}

export async function holdFunds(
  userId: string,
  amount: number,
  referenceId: string,
  description: string
): Promise<void> {
  const wallet = await getWalletByUserId(userId);
  if (!wallet) throw new Error(`Wallet not found for user ${userId}`);

  const available = parseFloat(wallet.balance) - parseFloat(wallet.holdBalance);
  if (available < amount) throw new Error("Insufficient wallet balance.");

  await db
    .update(wallets)
    .set({
      holdBalance: sql`${wallets.holdBalance} + ${amount.toFixed(2)}`,
      updatedAt: new Date(),
    })
    .where(eq(wallets.userId, userId));

  await recordTransaction(wallet.id, "hold", amount, referenceId, description);
}

export async function releaseFunds(
  userId: string,
  amount: number,
  referenceId: string,
  description: string
): Promise<void> {
  const wallet = await getWalletByUserId(userId);
  if (!wallet) throw new Error(`Wallet not found for user ${userId}`);

  await db
    .update(wallets)
    .set({
      holdBalance: sql`GREATEST(${wallets.holdBalance} - ${amount.toFixed(2)}, 0)`,
      updatedAt: new Date(),
    })
    .where(eq(wallets.userId, userId));

  await recordTransaction(wallet.id, "release", amount, referenceId, description);
}

export async function penaltyDebit(
  userId: string,
  amount: number,
  referenceId: string
): Promise<void> {
  const wallet = await getWalletByUserId(userId);
  if (!wallet) throw new Error(`Wallet not found for user ${userId}`);

  await db
    .update(wallets)
    .set({
      balance: sql`GREATEST(${wallets.balance} - ${amount.toFixed(2)}, 0)`,
      holdBalance: sql`GREATEST(${wallets.holdBalance} - ${amount.toFixed(2)}, 0)`,
      updatedAt: new Date(),
    })
    .where(eq(wallets.userId, userId));

  await recordTransaction(wallet.id, "penalty_debit", amount, referenceId, "Commitment failure penalty");
  logger.info(`[Wallet]: Penalty debit ${amount} from user ${userId}`);
}

export async function penaltyCredit(
  userId: string,
  amount: number,
  referenceId: string
): Promise<void> {
  const wallet = await getWalletByUserId(userId);
  if (!wallet) throw new Error(`Wallet not found for user ${userId}`);

  await db
    .update(wallets)
    .set({
      balance: sql`${wallets.balance} + ${amount.toFixed(2)}`,
      updatedAt: new Date(),
    })
    .where(eq(wallets.userId, userId));

  await recordTransaction(wallet.id, "penalty_credit", amount, referenceId, "Received penalty from failed commitment");
}

export async function getTransactionHistory(userId: string, limit = 20, offset = 0) {
  const wallet = await getWalletByUserId(userId);
  if (!wallet) return [];

  return db
    .select()
    .from(walletTransactions)
    .where(eq(walletTransactions.walletId, wallet.id))
    .orderBy(desc(walletTransactions.createdAt))
    .limit(limit)
    .offset(offset);
}

async function recordTransaction(
  walletId: string,
  type: TxType,
  amount: number,
  referenceId: string | null,
  description: string | null
): Promise<void> {
  await db.insert(walletTransactions).values({
    walletId,
    type,
    amount: amount.toFixed(2),
    referenceId,
    description,
  });
}
