import {
  pgTable,
  uuid,
  text,
  numeric,
  timestamp,
  boolean,
  integer,
  date,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ###

export const commitmentStatusEnum = pgEnum("commitment_status", [
  "active",
  "completed",
  "cancelled",
]);

export const payoutTypeEnum = pgEnum("payout_type", ["friend", "donate"]);

export const dailyRowStatusEnum = pgEnum("daily_row_status", [
  "pending",
  "submitted",
  "verified",
  "failed",
]);

export const txTypeEnum = pgEnum("tx_type", [
  "credit",
  "debit",
  "hold",
  "release",
  "penalty_debit",
  "penalty_credit",
]);

// ─── Users ######

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  myInviteCode: text("my_invite_code").notNull().unique(),
  inviteQuota: integer("invite_quota").default(10).notNull(),
  invitedById: uuid("invited_by_id"),
  isAdmin: boolean("is_admin").default(false).notNull(),
  expoPushTokens: text("expo_push_tokens").array().default([]).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const friendships = pgTable(
  "friendships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    friendId: uuid("friend_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("unique_friendship").on(t.userId, t.friendId)]
);

// ─── Wallets ###################

export const wallets = pgTable("wallets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  balance: numeric("balance", { precision: 14, scale: 2 }).default("1000").notNull(),
  holdBalance: numeric("hold_balance", { precision: 14, scale: 2 }).default("0").notNull(),
  currency: text("currency").default("POINTS").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const walletTransactions = pgTable("wallet_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  walletId: uuid("wallet_id")
    .notNull()
    .references(() => wallets.id, { onDelete: "cascade" }),
  type: txTypeEnum("type").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  referenceId: text("reference_id"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Commitments  ########

export const commitments = pgTable("commitments", {
  id: uuid("id").primaryKey().defaultRandom(),
  creatorId: uuid("creator_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  habitPrompt: text("habit_prompt"),
  dailyStake: numeric("daily_stake", { precision: 14, scale: 2 }).notNull(),
  payoutType: payoutTypeEnum("payout_type").default("donate").notNull(),
  status: commitmentStatusEnum("status").default("active").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  checkinHourIst: integer("checkin_hour_ist").default(8).notNull(),
  deadlineHourIst: integer("deadline_hour_ist").default(23).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const commitmentPartners = pgTable(
  "commitment_partners",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    commitmentId: uuid("commitment_id")
      .notNull()
      .references(() => commitments.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").default("partner").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("unique_commitment_member").on(t.commitmentId, t.userId)]
);

export const dailyCommitmentRows = pgTable("daily_commitment_rows", {
  id: uuid("id").primaryKey().defaultRandom(),
  commitmentId: uuid("commitment_id")
    .notNull()
    .references(() => commitments.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  status: dailyRowStatusEnum("status").default("pending").notNull(),
  storyImageUrl: text("story_image_url"),
  storyImagePublicId: text("story_image_public_id"),
  aiVerified: boolean("ai_verified"),
  retryCount: integer("retry_count").default(0).notNull(),
  deadline: timestamp("deadline").notNull(),
  submittedAt: timestamp("submitted_at"),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Invitations (pre-existing Supabase table — do not drop) ###

export const invitations = pgTable("invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── Relations  ################################

export const usersRelations = relations(users, ({ many }) => ({
  sentFriendships: many(friendships, { relationName: "user_friendships" }),
  wallet: many(wallets),
  commitments: many(commitments),
  commitmentPartners: many(commitmentPartners),
}));

export const friendshipsRelations = relations(friendships, ({ one }) => ({
  user: one(users, {
    fields: [friendships.userId],
    references: [users.id],
    relationName: "user_friendships",
  }),
  friend: one(users, {
    fields: [friendships.friendId],
    references: [users.id],
  }),
}));

export const walletsRelations = relations(wallets, ({ one, many }) => ({
  user: one(users, { fields: [wallets.userId], references: [users.id] }),
  transactions: many(walletTransactions),
}));

export const walletTransactionsRelations = relations(walletTransactions, ({ one }) => ({
  wallet: one(wallets, { fields: [walletTransactions.walletId], references: [wallets.id] }),
}));

export const commitmentsRelations = relations(commitments, ({ one, many }) => ({
  creator: one(users, { fields: [commitments.creatorId], references: [users.id] }),
  partners: many(commitmentPartners),
  dailyRows: many(dailyCommitmentRows),
}));

export const commitmentPartnersRelations = relations(commitmentPartners, ({ one }) => ({
  commitment: one(commitments, {
    fields: [commitmentPartners.commitmentId],
    references: [commitments.id],
  }),
  user: one(users, { fields: [commitmentPartners.userId], references: [users.id] }),
}));

export const dailyCommitmentRowsRelations = relations(dailyCommitmentRows, ({ one }) => ({
  commitment: one(commitments, {
    fields: [dailyCommitmentRows.commitmentId],
    references: [commitments.id],
  }),
  user: one(users, { fields: [dailyCommitmentRows.userId], references: [users.id] }),
}));

// ─── Types ############## --- ############ ---- ####### ---- #################

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Friendship = typeof friendships.$inferSelect;
export type Wallet = typeof wallets.$inferSelect;
export type NewWallet = typeof wallets.$inferInsert;
export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type TxType = (typeof txTypeEnum.enumValues)[number];
export type Commitment = typeof commitments.$inferSelect;
export type NewCommitment = typeof commitments.$inferInsert;
export type CommitmentPartner = typeof commitmentPartners.$inferSelect;
export type DailyCommitmentRow = typeof dailyCommitmentRows.$inferSelect;
