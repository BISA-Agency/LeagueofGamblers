import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { money } from "./_helpers";
import { challenges } from "./challenges";
import { profiles } from "./profiles";

export const participantStatusEnum = pgEnum("participant_status", [
  "joined",
  "active",
  "bust",
  "kicked",
  "disqualified",
]);

export const challengeParticipants = pgTable(
  "challenge_participants",
  {
    challengeId: uuid("challenge_id")
      .notNull()
      .references(() => challenges.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    balance: money("balance").notNull().default(0),
    status: participantStatusEnum("status").notNull().default("joined"),
    paidBuyIn: boolean("paid_buy_in").notNull().default(false),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    finalRank: integer("final_rank"),
    rebuys: integer("rebuys").notNull().default(0),
    warnings: integer("warnings").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.challengeId, table.userId] }),
    check("balance_non_negative", sql`${table.balance} >= 0`),
  ]
);

export type ChallengeParticipant = typeof challengeParticipants.$inferSelect;
export type NewChallengeParticipant = typeof challengeParticipants.$inferInsert;
