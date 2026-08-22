import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { money } from "./_helpers";
import { badges } from "./badges";
import { challenges } from "./challenges";

export const missionAppliesToEnum = pgEnum("mission_applies_to", [
  "sportsbook",
  "proof",
  "both",
]);

export type MissionAppliesTo = (typeof missionAppliesToEnum.enumValues)[number];

export const missions = pgTable("missions", {
  id: uuid("id").primaryKey().defaultRandom(),
  // null = reusable across challenges.
  challengeId: uuid("challenge_id").references(() => challenges.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  // Not a DB enum on purpose: new mission types are added by registering a
  // new module in lib/missions/types/, not by migrating the schema. Valid
  // values are validated at the application layer against that registry.
  type: text("type").notNull(),
  params: jsonb("params").notNull().default({}),
  appliesTo: missionAppliesToEnum("applies_to").notNull().default("both"),
  rewardAmount: money("reward_amount"),
  rewardBadgeId: uuid("reward_badge_id").references(() => badges.id),
  rewardXp: integer("reward_xp"),
  // null = unlimited winners.
  maxWinners: integer("max_winners"),
  repeatable: boolean("repeatable").notNull().default(false),
  hidden: boolean("hidden").notNull().default(false),
  validFrom: timestamp("valid_from", { withTimezone: true }),
  validTo: timestamp("valid_to", { withTimezone: true }),
});

export type Mission = typeof missions.$inferSelect;
export type NewMission = typeof missions.$inferInsert;
