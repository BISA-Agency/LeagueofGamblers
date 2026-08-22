import { and, count, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { bets } from "@drizzle/schema";

/**
 * Counted in the database rather than in memory: every request can land on a
 * different serverless instance, so an in-process counter would reset
 * constantly and enforce nothing.
 *
 * The realistic failure here isn't an attacker, it's a double-tap on a slow
 * connection turning into two identical bets. The burst window catches that;
 * the per-minute cap catches a script.
 */
const BURST_WINDOW_MS = 3_000;
const PER_MINUTE_LIMIT = 12;

export class RateLimitError extends Error {}

export async function assertBetRateLimit(userId: string) {
  const now = Date.now();

  const [burst] = await db
    .select({ n: count() })
    .from(bets)
    .where(
      and(eq(bets.userId, userId), gte(bets.placedAt, new Date(now - BURST_WINDOW_MS)))
    );
  if (burst.n > 0) {
    throw new RateLimitError("Je plaatste net al een bet — wacht even voor de volgende.");
  }

  const [perMinute] = await db
    .select({ n: count() })
    .from(bets)
    .where(and(eq(bets.userId, userId), gte(bets.placedAt, new Date(now - 60_000))));
  if (perMinute.n >= PER_MINUTE_LIMIT) {
    throw new RateLimitError("Te veel bets achter elkaar. Probeer het over een minuut opnieuw.");
  }
}
