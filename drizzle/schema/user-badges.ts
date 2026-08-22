import { boolean, pgTable, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { badges } from "./badges";
import { challenges } from "./challenges";
import { profiles } from "./profiles";

export const userBadges = pgTable(
  "user_badges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    badgeId: uuid("badge_id")
      .notNull()
      .references(() => badges.id, { onDelete: "cascade" }),
    challengeId: uuid("challenge_id").references(() => challenges.id, { onDelete: "cascade" }),
    awardedAt: timestamp("awarded_at", { withTimezone: true }).notNull().defaultNow(),
    awardedBy: uuid("awarded_by").references(() => profiles.id),
    featured: boolean("featured").notNull().default(false),
  },
  (table) => [
    // Every award path relies on onConflictDoNothing to stay idempotent, which
    // needs a real constraint to conflict against. nullsNotDistinct so that
    // cross-challenge badges (challenge_id null) can't be handed out twice.
    unique("user_badges_unique")
      .on(table.userId, table.badgeId, table.challengeId)
      .nullsNotDistinct(),
  ]
);

export type UserBadge = typeof userBadges.$inferSelect;
export type NewUserBadge = typeof userBadges.$inferInsert;
