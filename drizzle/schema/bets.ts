import { boolean, numeric, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { money } from "./_helpers";
import { challenges } from "./challenges";
import { profiles } from "./profiles";

export const betKindEnum = pgEnum("bet_kind", ["sportsbook", "proof"]);
export const betTypeEnum = pgEnum("bet_type", ["single", "combi"]);
export const betStatusEnum = pgEnum("bet_status", [
  "open",
  "won",
  "lost",
  "void",
  "half_won",
  "half_lost",
]);
export const bookmakerEnum = pgEnum("bookmaker", [
  "toto",
  "unibet",
  "bet365",
  "holland_casino",
  "jacks",
  "betcity",
  "overig",
]);
export const verificationStatusEnum = pgEnum("verification_status", [
  "n/a",
  "pending",
  "approved",
  "rejected",
]);

export type BetKind = (typeof betKindEnum.enumValues)[number];
export type BetType = (typeof betTypeEnum.enumValues)[number];
export type BetStatus = (typeof betStatusEnum.enumValues)[number];
export type Bookmaker = (typeof bookmakerEnum.enumValues)[number];
export type VerificationStatus = (typeof verificationStatusEnum.enumValues)[number];

export const bets = pgTable("bets", {
  id: uuid("id").primaryKey().defaultRandom(),
  challengeId: uuid("challenge_id")
    .notNull()
    .references(() => challenges.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  kind: betKindEnum("kind").notNull(),
  type: betTypeEnum("type").notNull(),
  stake: money("stake").notNull(),
  // Captured at placement time (stake === balance right before it was
  // deducted) — needed for the all_in_win mission type, which can't be
  // reconstructed later since balance isn't kept as a historical ledger.
  wasAllIn: boolean("was_all_in").notNull().default(false),
  totalOdds: numeric("total_odds", { precision: 10, scale: 3, mode: "number" }).notNull(),
  potentialPayout: money("potential_payout").notNull(),
  status: betStatusEnum("status").notNull().default("open"),
  placedAt: timestamp("placed_at", { withTimezone: true }).notNull().defaultNow(),
  // Earliest selection's start time — used to gate editing/cancelling and to
  // decide what happens to the bet when a challenge ends (§5.2).
  eventStart: timestamp("event_start", { withTimezone: true }).notNull(),
  settledAt: timestamp("settled_at", { withTimezone: true }),
  settledBy: uuid("settled_by").references(() => profiles.id),
  settlementSource: text("settlement_source"),
  note: text("note"),
  bookmaker: bookmakerEnum("bookmaker"),
  screenshotUrl: text("screenshot_url"),
  verificationStatus: verificationStatusEnum("verification_status").notNull().default("n/a"),
  verifiedBy: uuid("verified_by").references(() => profiles.id),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
});

export type Bet = typeof bets.$inferSelect;
export type NewBet = typeof bets.$inferInsert;
