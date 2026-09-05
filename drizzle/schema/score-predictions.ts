import { date, integer, pgTable, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { money } from "./_helpers";
import { challenges } from "./challenges";
import { events } from "./events";
import { profiles } from "./profiles";

/**
 * The match of the day: one fixture per challenge per day, picked by the
 * admin, that everyone may guess the score of.
 *
 * Its own row rather than a flag on the event, because an event can be shared
 * between challenges and "featured" is a property of a challenge's day, not of
 * the fixture. The unique constraint is the rule itself — one match per day,
 * enforced by the database rather than by whoever remembers.
 */
export const dailyMatches = pgTable(
  "daily_matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    challengeId: uuid("challenge_id")
      .notNull()
      .references(() => challenges.id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    /** Amsterdam calendar day this is the match for. */
    matchDay: date("match_day").notNull(),
    createdBy: uuid("created_by").references(() => profiles.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("daily_matches_challenge_day_unique").on(table.challengeId, table.matchDay)]
);

/**
 * One guess per player per featured match, and the unique constraint is what
 * makes "one guess" true — a second submit hits the database, not a check that
 * might have raced.
 *
 * The score is stored as two numbers rather than a "2-1" string: it is a
 * score, and comparing it to a result should not depend on how it was spelled.
 */
export const scorePredictions = pgTable(
  "score_predictions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dailyMatchId: uuid("daily_match_id")
      .notNull()
      .references(() => dailyMatches.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    homeGoals: integer("home_goals").notNull(),
    awayGoals: integer("away_goals").notNull(),
    /** Set when the match is settled; 0 for a miss, the prize for a hit. */
    rewardAmount: money("reward_amount"),
    settledAt: timestamp("settled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("score_predictions_match_user_unique").on(table.dailyMatchId, table.userId)]
);

export type DailyMatch = typeof dailyMatches.$inferSelect;
export type ScorePrediction = typeof scorePredictions.$inferSelect;
export type NewScorePrediction = typeof scorePredictions.$inferInsert;
