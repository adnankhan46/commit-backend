import { eq, sql, gt, and } from "drizzle-orm";
import jwt from "jsonwebtoken";
import db from "../../db/index.js";
import { users, wallets } from "../../db/schema/index.js";
import config from "../../config/env.js";
import logger from "../../utils/logger.js";
import type { SignupDTO, LoginDTO } from "./auth.validator.js";

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function generateUniqueInviteCode(): Promise<string> {
  let attempts = 0;
  while (attempts < 10) {
    const code = generateInviteCode();
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.myInviteCode, code))
      .limit(1);
    if (existing.length === 0) return code;
    attempts++;
  }
  throw new Error("Could not generate a unique invite code. Please try again.");
}

function signToken(userId: string, isAdmin: boolean): string {
  return jwt.sign({ userId, isAdmin }, config.JWT_SECRET, { expiresIn: "90d" });
}

export async function signup({ email, inviteCode }: SignupDTO) {
  const normalizedEmail = email.toLowerCase().trim();
  const normalizedCode = inviteCode.trim().toUpperCase();

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);
  if (existing.length > 0) throw new Error("Email already registered.");

  const isAdminCode = normalizedCode === config.ADMIN_INVITE_CODE.toUpperCase();

  let invitedById: string | undefined;

  if (isAdminCode) {
    const adminEmails = config.ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase());
    if (!adminEmails.includes(normalizedEmail)) {
      throw new Error("This invite code is reserved for admin users.");
    }
  } else {
    const owner = await db
      .select()
      .from(users)
      .where(eq(users.myInviteCode, normalizedCode))
      .limit(1);
    if (owner.length === 0) throw new Error("Invalid invite code.");
    if (owner[0]!.inviteQuota <= 0) throw new Error("This invite code has been fully used.");
    invitedById = owner[0]!.id;
  }

  const myInviteCode = await generateUniqueInviteCode();

  const newUserRows = await db
    .insert(users)
    .values({
      email: normalizedEmail,
      myInviteCode,
      inviteQuota: 10,
      invitedById: invitedById ?? null,
      isAdmin: isAdminCode,
      expoPushTokens: [],
    })
    .returning();

  const newUser = newUserRows[0]!;

  await db.insert(wallets).values({
    userId: newUser.id,
    balance: "1000",
    holdBalance: "0",
    currency: "POINTS",
  });

  if (invitedById) {
    await db
      .update(users)
      .set({ inviteQuota: sql`${users.inviteQuota} - 1` })
      .where(and(eq(users.id, invitedById), gt(users.inviteQuota, 0)));
  }

  const token = signToken(newUser.id, newUser.isAdmin);
  logger.info(`[Auth]: New user registered: ${normalizedEmail}`);
  return { user: newUser, token };
}

export async function login({ email, inviteCode }: LoginDTO) {
  const normalizedEmail = email.toLowerCase().trim();
  const normalizedCode = inviteCode.trim().toUpperCase();

  const userRows = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (userRows.length === 0) throw new Error("No account found with this email.");

  const user = userRows[0]!;
  if (user.myInviteCode !== normalizedCode) throw new Error("Invalid invite code.");

  const token = signToken(user.id, user.isAdmin);
  logger.info(`[Auth]: User logged in: ${normalizedEmail}`);
  return { user, token };
}

export async function sendInvite(userId: string, friendEmail: string) {
  const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (userRows.length === 0) throw new Error("User not found.");

  const user = userRows[0]!;
  if (user.inviteQuota <= 0) throw new Error("You have no invite quota remaining.");

  return { inviteCode: user.myInviteCode, inviterEmail: user.email };
}
