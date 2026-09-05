import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { money } from "./_helpers";
import { profiles } from "./profiles";

/**
 * Affiliate money actually sent, in crypto, by hand.
 *
 * Its own table rather than a fifth value on the payments direction enum, for
 * one blunt reason: Postgres lets you add an enum value but not remove one.
 * While this whole idea is still on trial, "drop table referral_payouts" has
 * to be the entire undo.
 *
 * What is earned is not stored anywhere — it is computed from who invited whom
 * (see lib/referrals/credits.ts). Only what has been paid out is a fact worth
 * writing down, because without it the same commission gets sent twice.
 */
export const referralPayouts = pgTable("referral_payouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  amount: money("amount").notNull(),
  /** NetworkId from lib/payments/networks.ts — text, so the list can change. */
  network: text("network"),
  /** The chain is the receipt. Unique, so the same transfer can't be logged twice. */
  txHash: text("tx_hash").unique(),
  note: text("note"),
  paidBy: uuid("paid_by").references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ReferralPayout = typeof referralPayouts.$inferSelect;
export type NewReferralPayout = typeof referralPayouts.$inferInsert;
