import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { money } from "./_helpers";
import { profiles } from "./profiles";

export const challengeStatusEnum = pgEnum("challenge_status", [
  "draft",
  "open",
  "live",
  "settling",
  "finished",
]);

export const challengeDurationTypeEnum = pgEnum("challenge_duration_type", [
  "week",
  "month",
  "season",
  "custom",
]);

export const challengePrizeModeEnum = pgEnum("challenge_prize_mode", [
  "standard",
  "hardcore",
]);

export const challenges = pgTable(
  "challenges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    descriptionMd: text("description_md"),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    status: challengeStatusEnum("status").notNull().default("draft"),
    startingBalance: money("starting_balance").notNull().default(10000),
    buyInAmount: money("buy_in_amount").notNull().default(100),
    // Charged on top of the buy-in, so the pot is unaffected. 0 for the
    // friends-and-cash challenges this started as.
    platformFeePercent: integer("platform_fee_percent").notNull().default(10),
    currency: text("currency").notNull().default("EUR"),
    maxPlayers: integer("max_players"),
    missionBudget: money("mission_budget").notNull().default(0),
    // Per-challenge override of the default prize_tiers staffel (§5.2) — added in Fase 1.
    prizeSplitOverride: jsonb("prize_split_override"),
    sportKeys: text("sport_keys")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    markets: text("markets")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    allowRebuy: boolean("allow_rebuy").notNull().default(false),
    durationType: challengeDurationTypeEnum("duration_type").notNull().default("custom"),
    prizeMode: challengePrizeModeEnum("prize_mode").notNull().default("standard"),
    // Days after startAt during which a challenge already "live" can still be
    // joined. 0 = today's behaviour (join only while status is "open").
    lateJoinDays: integer("late_join_days").notNull().default(0),
    bountyEnabled: boolean("bounty_enabled").notNull().default(false),
    // Carved out of buyInAmount when bountyEnabled — see effectiveBuyIn() in
    // src/lib/settlement/payouts.ts. Meaningless while bountyEnabled is false.
    bountyPerPlayer: money("bounty_per_player").notNull().default(0),
    autoPublishImports: boolean("auto_publish_imports").notNull().default(false),
    // Optional Thursday mini-import alongside the main Monday one (§5.3, default off).
    midweekImportEnabled: boolean("midweek_import_enabled").notNull().default(false),
    // Fase 3 prep only — no wallet logic in fase 1 (§6).
    walletAddress: text("wallet_address"),
    createdBy: uuid("created_by").references(() => profiles.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check("challenge_dates", sql`${table.endAt} > ${table.startAt}`)]
);

export type Challenge = typeof challenges.$inferSelect;
export type NewChallenge = typeof challenges.$inferInsert;
