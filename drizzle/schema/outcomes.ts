import { numeric, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { markets } from "./markets";

export const outcomeResultEnum = pgEnum("outcome_result", [
  "won",
  "lost",
  "void",
  "half_won",
  "half_lost",
]);

export const outcomes = pgTable("outcomes", {
  id: uuid("id").primaryKey().defaultRandom(),
  marketId: uuid("market_id")
    .notNull()
    .references(() => markets.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  odds: numeric("odds", { precision: 8, scale: 2, mode: "number" }).notNull(),
  result: outcomeResultEnum("result"),
});

export type Outcome = typeof outcomes.$inferSelect;
export type NewOutcome = typeof outcomes.$inferInsert;
