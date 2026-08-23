import { numeric, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { money } from "./_helpers";
import { challenges } from "./challenges";
import { profiles } from "./profiles";

// bank/crypto aren't used until Fase 3, but declared now so no migration is
// needed later just to add an enum value (§6).
export const paymentProviderEnum = pgEnum("payment_provider", ["cash", "bank", "crypto"]);
export const paymentDirectionEnum = pgEnum("payment_direction", [
  "buy_in",
  "payout_mission",
  "payout_prize",
  "refund",
]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "confirmed", "rejected"]);

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  provider: paymentProviderEnum("provider").notNull().default("cash"),
  direction: paymentDirectionEnum("direction").notNull(),
  amount: money("amount").notNull(),
  currency: text("currency").notNull().default("EUR"),
  status: paymentStatusEnum("status").notNull().default("pending"),
  // Free text, e.g. "contant ontvangen 3/9".
  reference: text("reference"),
  // --- crypto buy-ins ---
  // Which chain the player says they sent on. USDT exists on several and they
  // are not interchangeable, so this is recorded, not inferred.
  network: text("network"),
  // The chain is the real proof, not the screenshot: a hash can be looked up,
  // and the unique constraint stops the same transaction being claimed twice.
  txHash: text("tx_hash").unique(),
  // Stored path in a private bucket, never a URL.
  screenshotUrl: text("screenshot_url"),
  // What the player was asked to send, so an admin can compare against the
  // chain without recomputing a rate that has since moved.
  tokenAmount: numeric("token_amount", { precision: 18, scale: 6, mode: "number" }),
  // The platform's cut, charged ON TOP of the buy-in. Kept beside the buy-in
  // rather than as its own row so the pot stays "sum of amount" and revenue
  // stays "sum of fee_amount" — one row still tells the whole story.
  feeAmount: money("fee_amount").notNull().default(0),
  confirmedBy: uuid("confirmed_by").references(() => profiles.id),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  challengeId: uuid("challenge_id")
    .notNull()
    .references(() => challenges.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
