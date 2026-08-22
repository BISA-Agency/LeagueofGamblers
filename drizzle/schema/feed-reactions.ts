import { pgTable, primaryKey, text, uuid } from "drizzle-orm/pg-core";
import { activityFeed } from "./activity-feed";
import { profiles } from "./profiles";

export const feedReactions = pgTable(
  "feed_reactions",
  {
    feedId: uuid("feed_id")
      .notNull()
      .references(() => activityFeed.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    emoji: text("emoji").notNull(),
  },
  (table) => [primaryKey({ columns: [table.feedId, table.userId, table.emoji] })]
);

export type FeedReaction = typeof feedReactions.$inferSelect;
export type NewFeedReaction = typeof feedReactions.$inferInsert;
