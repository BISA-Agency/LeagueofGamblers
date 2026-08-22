import { jsonb, pgTable, text, timestamp, uuid, type AnyPgColumn } from "drizzle-orm/pg-core";
import { challenges } from "./challenges";
import { profiles } from "./profiles";

export const activityFeed = pgTable("activity_feed", {
  id: uuid("id").primaryKey().defaultRandom(),
  challengeId: uuid("challenge_id")
    .notNull()
    .references(() => challenges.id, { onDelete: "cascade" }),
  // Null for challenge-wide system events (e.g. "nieuwe odds staan live").
  userId: uuid("user_id").references(() => profiles.id, { onDelete: "cascade" }),
  // System events ("bet_won" | "bust" | "mission_completed" | "odds_published"
  // | ...) and player chat ("chat", payload {text}) share this table on
  // purpose: the timeline is one conversation where a settled bet and the
  // banter about it live together.
  type: text("type").notNull(),
  payload: jsonb("payload").notNull().default({}),
  // Set = this row is a reply in the thread under `parent_id`. Threads are one
  // level deep: replying to a reply lands in the same thread.
  parentId: uuid("parent_id").references((): AnyPgColumn => activityFeed.id, {
    onDelete: "cascade",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ActivityFeedEntry = typeof activityFeed.$inferSelect;
export type NewActivityFeedEntry = typeof activityFeed.$inferInsert;
