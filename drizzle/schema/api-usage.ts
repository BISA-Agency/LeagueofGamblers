import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * One row per metered provider call.
 *
 * The Odds API bills per request and reports the running totals in response
 * headers. Import spend was recorded on odds_imports, but the results cron —
 * which went from one run a day to twenty-four — reported nothing at all, so
 * the largest recurring cost was the one nobody could see. Spend that isn't
 * recorded isn't managed.
 */
export const apiUsage = pgTable("api_usage", {
  id: uuid("id").primaryKey().defaultRandom(),
  provider: text("provider").notNull().default("the_odds_api"),
  /** "odds" (bulk per sport), "event_odds" (extra markets), "scores" (results). */
  endpoint: text("endpoint").notNull(),
  /** What this call cost, from x-requests-last. */
  creditsUsed: integer("credits_used").notNull(),
  /** What was left afterwards, from x-requests-remaining. Null if absent. */
  creditsRemaining: integer("credits_remaining"),
  /** Sport key where the call was for one, so spend can be attributed. */
  sportKey: text("sport_key"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ApiUsage = typeof apiUsage.$inferSelect;
export type NewApiUsage = typeof apiUsage.$inferInsert;
