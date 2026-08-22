import { pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { bets } from "./bets";
import { challenges } from "./challenges";
import { missions } from "./missions";
import { profiles } from "./profiles";

export const missionCompletions = pgTable("mission_completions", {
  id: uuid("id").primaryKey().defaultRandom(),
  missionId: uuid("mission_id")
    .notNull()
    .references(() => missions.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  challengeId: uuid("challenge_id")
    .notNull()
    .references(() => challenges.id, { onDelete: "cascade" }),
  completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  betId: uuid("bet_id").references(() => bets.id),
});

export type MissionCompletion = typeof missionCompletions.$inferSelect;
export type NewMissionCompletion = typeof missionCompletions.$inferInsert;
