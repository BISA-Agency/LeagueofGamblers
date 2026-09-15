import { integer, pgEnum, pgTable, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { money } from "./_helpers";
import { challenges } from "./challenges";
import { events } from "./events";
import { profiles } from "./profiles";

export const bountyRoundStatusEnum = pgEnum("bounty_round_status", [
  "collecting",
  "settled",
  "unclaimed",
]);

/**
 * One per bust, when the challenge has bounty mode on. payoutAmount is
 * snapshotted from challenge.bountyPerPlayer at creation time, so a later
 * admin edit to that setting can't change the payout of a round already in
 * flight.
 */
export const bountyRounds = pgTable("bounty_rounds", {
  id: uuid("id").primaryKey().defaultRandom(),
  challengeId: uuid("challenge_id")
    .notNull()
    .references(() => challenges.id, { onDelete: "cascade" }),
  bustedUserId: uuid("busted_user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  status: bountyRoundStatusEnum("status").notNull().default("collecting"),
  payoutAmount: money("payout_amount").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  settledAt: timestamp("settled_at", { withTimezone: true }),
});

/**
 * The 5 fixtures picked for a round. resolvedAt is set once this match has a
 * final result — either a score (settleBountyPredictionsForEvent) or a void
 * (resolveBountyMatchesForVoidedEvent) — and is what lets a round settle
 * once every one of its matches is resolved, without getting stuck forever
 * on a postponed fixture.
 */
export const bountyRoundMatches = pgTable(
  "bounty_round_matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bountyRoundId: uuid("bounty_round_id")
      .notNull()
      .references(() => bountyRounds.id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [unique("bounty_round_matches_round_event_unique").on(table.bountyRoundId, table.eventId)]
);

/** One guess per player per match. points is 3/1/0, filled in at settlement. */
export const bountyPredictions = pgTable(
  "bounty_predictions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bountyRoundMatchId: uuid("bounty_round_match_id")
      .notNull()
      .references(() => bountyRoundMatches.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    homeGoals: integer("home_goals").notNull(),
    awayGoals: integer("away_goals").notNull(),
    points: integer("points"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("bounty_predictions_match_user_unique").on(table.bountyRoundMatchId, table.userId)]
);

export type BountyRound = typeof bountyRounds.$inferSelect;
export type NewBountyRound = typeof bountyRounds.$inferInsert;
export type BountyRoundMatch = typeof bountyRoundMatches.$inferSelect;
export type NewBountyRoundMatch = typeof bountyRoundMatches.$inferInsert;
export type BountyPrediction = typeof bountyPredictions.$inferSelect;
export type NewBountyPrediction = typeof bountyPredictions.$inferInsert;
