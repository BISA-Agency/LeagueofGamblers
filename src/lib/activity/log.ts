import { db } from "@/lib/db";
import { activityFeed } from "@drizzle/schema";

export type ActivityType =
  | "bet_placed"
  | "bet_won"
  | "bet_lost"
  | "bust"
  | "mission_completed"
  | "badge_awarded"
  | "odds_published"
  | "challenge_won";

export async function logActivity(
  challengeId: string,
  userId: string | null,
  type: ActivityType,
  payload: Record<string, unknown> = {}
) {
  await db.insert(activityFeed).values({ challengeId, userId, type, payload });
}
