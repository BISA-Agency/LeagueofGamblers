import { numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { bets } from "./bets";
import { outcomeResultEnum, outcomes } from "./outcomes";

export const betSelections = pgTable("bet_selections", {
  id: uuid("id").primaryKey().defaultRandom(),
  betId: uuid("bet_id")
    .notNull()
    .references(() => bets.id, { onDelete: "cascade" }),
  // Set for sportsbook bets (links back to the live market); null for proof
  // bets, which describe the selection in free text instead.
  outcomeId: uuid("outcome_id").references(() => outcomes.id),
  eventName: text("event_name").notNull(),
  eventStart: timestamp("event_start", { withTimezone: true }).notNull(),
  sport: text("sport").notNull(),
  competition: text("competition"),
  marketLabel: text("market_label").notNull(),
  selectionLabel: text("selection_label").notNull(),
  odds: numeric("odds", { precision: 8, scale: 2, mode: "number" }).notNull(),
  result: outcomeResultEnum("result"),
});

export type BetSelection = typeof betSelections.$inferSelect;
export type NewBetSelection = typeof betSelections.$inferInsert;
