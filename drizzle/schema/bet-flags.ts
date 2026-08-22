import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { bets } from "./bets";
import { profiles } from "./profiles";

export const betFlagStatusEnum = pgEnum("bet_flag_status", ["open", "resolved"]);

export const betFlags = pgTable("bet_flags", {
  id: uuid("id").primaryKey().defaultRandom(),
  betId: uuid("bet_id")
    .notNull()
    .references(() => bets.id, { onDelete: "cascade" }),
  flaggedBy: uuid("flagged_by")
    .notNull()
    .references(() => profiles.id),
  reason: text("reason").notNull(),
  status: betFlagStatusEnum("status").notNull().default("open"),
  resolvedBy: uuid("resolved_by").references(() => profiles.id),
  resolutionNote: text("resolution_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type BetFlag = typeof betFlags.$inferSelect;
export type NewBetFlag = typeof betFlags.$inferInsert;
