import { numeric, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { events } from "./events";

export const marketTypeEnum = pgEnum("market_type", [
  "h2h",
  "totals",
  "spreads",
  "custom",
  // Added with the market expansion. Everything here settles from a final
  // score — see src/lib/settlement/markets.ts.
  "team_totals",
  "btts",
  "double_chance",
  "draw_no_bet",
  // Outcomes are stored normalised as "home-away" ("2-1"), never in the
  // provider's own "Team:2|Team:1" wording — see odds-provider/correct-score.ts.
  "correct_score",
]);
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
  // A spread's line is always the HOME team's handicap.
  line: numeric("line", { precision: 6, scale: 2, mode: "number" }),
  // Which team the line belongs to — team totals only, null everywhere else.
  team: text("team"),
  status: marketStatusEnum("status").notNull().default("open"),
});

export type Market = typeof markets.$inferSelect;
export type NewMarket = typeof markets.$inferInsert;
