import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { challenges } from "./challenges";
import { profiles } from "./profiles";

export const activityFeed = pgTable("activity_feed", {
  id: uuid("id").primaryKey().defaultRandom(),
  challengeId: uuid("challenge_id")
    .notNull()
    .references(() => challenges.id, { onDelete: "cascade" }),
  // Null for challenge-wide system events (e.g. "nieuwe odds staan live").
  userId: uuid("user_id").references(() => profiles.id, { onDelete: "cascade" }),
  // e.g. "bet_won" | "bust" | "mission_completed" | "rank_up" | "odds_published"
  type: text("type").notNull(),
  payload: jsonb("payload").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ActivityFeedEntry = typeof activityFeed.$inferSelect;
export type NewActivityFeedEntry = typeof activityFeed.$inferInsert;
