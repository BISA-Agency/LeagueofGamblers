import { and, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { bets, type Bet } from "@drizzle/schema";

function profitOf(bet: Bet): number {
  if (bet.status === "won") return bet.potentialPayout - bet.stake;
  if (bet.status === "half_won") return (bet.potentialPayout - bet.stake) / 2;
  return 0;
}

/** The biggest winning bet settled in the last 24 hours (§5.9), or null. */
export async function getBetOfTheDay(challengeId: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const candidates = await db.query.bets.findMany({
    where: and(
      eq(bets.challengeId, challengeId),
      inArray(bets.status, ["won", "half_won"]),
      gte(bets.settledAt, since)
    ),
    with: { user: true, selections: true },
  });

  if (candidates.length === 0) return null;

  const winner = candidates.reduce((best, b) => (profitOf(b) > profitOf(best) ? b : best));
  const profit = profitOf(winner);
  if (profit <= 0) return null;

  return { bet: winner, profit };
}
