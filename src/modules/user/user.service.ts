import { eq } from "drizzle-orm";
import db from "../../db/index.js";
import { users, wallets } from "../../db/schema/index.js";

export async function getMe(userId: string) {
  const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (userRows.length === 0) throw new Error("User not found.");

  const walletRows = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
  const wallet = walletRows[0] ?? null;

  return {
    ...userRows[0]!,
    wallet: wallet
      ? {
          ...wallet,
          availableBalance: (
            parseFloat(wallet.balance) - parseFloat(wallet.holdBalance)
          ).toFixed(2),
        }
      : null,
  };
}

export async function updatePushToken(
  userId: string,
  pushToken: string,
  action: "add" | "remove"
) {
  const userRows = await db
    .select({ tokens: users.expoPushTokens })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (userRows.length === 0) throw new Error("User not found.");

  const current = userRows[0]!.tokens ?? [];
  const updated =
    action === "add"
      ? current.includes(pushToken)
        ? current
        : [...current, pushToken]
      : current.filter((t) => t !== pushToken);

  await db
    .update(users)
    .set({ expoPushTokens: updated, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return { message: "Push token updated." };
}

export async function getUserById(id: string) {
  const userRows = await db
    .select({
      id: users.id,
      email: users.email,
      myInviteCode: users.myInviteCode,
      inviteQuota: users.inviteQuota,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (userRows.length === 0) throw new Error("User not found.");
  return userRows[0]!;
}
