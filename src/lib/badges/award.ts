import { eq } from "drizzle-orm";
import { logActivity } from "@/lib/activity/log";
import { db } from "@/lib/db";
import { badges, userBadges } from "@drizzle/schema";

/** Slugs from the §5.8 seed set that the app awards on its own. */
export type BadgeSlug =
  | "challenge-winner"
  | "podium"
  | "longshot"
  | "iron-bankroll"
  | "hot-streak"
  | "combi-king"
  | "sharp"
  | "first-blood"
  | "comeback"
  | "all-in"
  | "bust"
  | "veteran"
  | "scout"
  | "clean-sheet";

/**
 * Idempotent: relies on the user_badges_unique constraint, so calling this
 * repeatedly (every settlement, every cron run) only ever awards once and
 * only announces the award the first time.
 */
export async function awardBadgeBySlug(
  slug: BadgeSlug,
  userId: string,
  challengeId: string | null
): Promise<boolean> {
  const badge = await db.query.badges.findFirst({ where: eq(badges.slug, slug) });
  if (!badge) return false;

  const inserted = await db
    .insert(userBadges)
    .values({ userId, badgeId: badge.id, challengeId })
    .onConflictDoNothing()
    .returning({ id: userBadges.id });

  if (inserted.length === 0) return false;

  if (challengeId) {
    await logActivity(challengeId, userId, "badge_awarded", { name: badge.name });
  }
  return true;
}
