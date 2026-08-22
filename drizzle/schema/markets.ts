import { numeric, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { events } from "./events";

export const marketTypeEnum = pgEnum("market_type", ["h2h", "totals", "spreads", "custom"]);
export const marketStatusEnum = pgEnum("market_status", [
  "open",
  "suspended",
  "closed",
  "settled",
  "void",
]);

export const markets = pgTable("markets", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  type: marketTypeEnum("type").notNull(),
  label: text("label").notNull(),
  // e.g. the total for an over/under market, or the handicap for spreads.
  line: numeric("line", { precision: 6, scale: 2, mode: "number" }),
  status: marketStatusEnum("status").notNull().default("open"),
});

export type Market = typeof markets.$inferSelect;
export type NewMarket = typeof markets.$inferInsert;
