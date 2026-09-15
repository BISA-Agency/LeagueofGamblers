import { and, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { bets } from "@drizzle/schema";

const HOT_WINDOW_MS = 60 * 60_000;
const HOT_THRESHOLD = 5;

/** A challenge counts as "hot" once 5+ bets have been placed on it in the last hour. */
export async function isHotChallenge(challengeId: string, now = new Date()): Promise<boolean> {
  const since = new Date(now.getTime() - HOT_WINDOW_MS);
  const count = await db.$count(
    bets,
    and(eq(bets.challengeId, challengeId), gte(bets.placedAt, since))
  );
  return count >= HOT_THRESHOLD;
}
