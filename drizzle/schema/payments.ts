import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
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
  // Free text (e.g. "contant ontvangen 3/9") or a tx hash in Fase 3.
  reference: text("reference"),
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
