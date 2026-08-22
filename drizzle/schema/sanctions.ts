import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { money } from "./_helpers";
import { bets } from "./bets";
import { challenges } from "./challenges";
import { profiles } from "./profiles";

export const sanctionTypeEnum = pgEnum("sanction_type", [
  "warning",
  "balance_penalty",
  "disqualification",
]);

export const sanctions = pgTable("sanctions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  challengeId: uuid("challenge_id")
    .notNull()
    .references(() => challenges.id, { onDelete: "cascade" }),
  type: sanctionTypeEnum("type").notNull(),
  // Set for balance_penalty (e.g. -10% of balance).
  amount: money("amount"),
  reason: text("reason").notNull(),
  betId: uuid("bet_id").references(() => bets.id),
  issuedBy: uuid("issued_by")
    .notNull()
    .references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Sanction = typeof sanctions.$inferSelect;
export type NewSanction = typeof sanctions.$inferInsert;
