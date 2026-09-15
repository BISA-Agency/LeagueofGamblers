import { and, eq, isNull } from "drizzle-orm";
import { bountyPredictions, bountyRoundMatches, bountyRounds, payments } from "@drizzle/schema";

/**
 * `@/lib/db` opens the real Postgres connection at import time (throws if
 * `DATABASE_URL` isn't set), so a static import here would break
 * `scoreBountyPrediction`/`resolveBountyWinners`'s own unit test the moment it
 * imports this module — same reason every other unit-tested file in this repo
 * (markets.ts, decide-bet.ts, payouts.ts, ...) has no `db` import at all.
 * Deferred so it only resolves when one of the DB-touching functions below
 * actually runs.
 */
async function getDb() {
  const { db } = await import("@/lib/db");
  return db;
}

/** 3 for the exact score, 1 for the correct winner (or a correctly-called draw), 0 for a miss. */
export function scoreBountyPrediction(
  prediction: { homeGoals: number; awayGoals: number },
  result: { homeScore: number; awayScore: number }
): number {
  if (prediction.homeGoals === result.homeScore && prediction.awayGoals === result.awayScore) {
    return 3;
  }
  const predictedOutcome = Math.sign(prediction.homeGoals - prediction.awayGoals);
  const actualOutcome = Math.sign(result.homeScore - result.awayScore);
  return predictedOutcome === actualOutcome ? 1 : 0;
}

/**
 * Every user tied at the highest total wins, splitting the bounty. A highest
 * total of 0 means nobody predicted anything correctly (or nobody predicted
 * at all) — the round goes unclaimed rather than rewarding a field of zeros.
 */
export function resolveBountyWinners(totals: { userId: string; points: number }[]): string[] {
  if (totals.length === 0) return [];
  const max = Math.max(...totals.map((t) => t.points));
  if (max <= 0) return [];
  return totals.filter((t) => t.points === max).map((t) => t.userId);
}

/** Pays out a round: one `payments` row per tied winner, real money, separate from challenge balance. */
async function settleBountyRound(bountyRoundId: string) {
  const db = await getDb();
  const round = await db.query.bountyRounds.findFirst({
    where: eq(bountyRounds.id, bountyRoundId),
    with: { matches: { with: { predictions: true } } },
  });
  if (!round || round.status !== "collecting") return;

  const totalsByUser = new Map<string, number>();
  for (const match of round.matches) {
    for (const prediction of match.predictions) {
      totalsByUser.set(
        prediction.userId,
        (totalsByUser.get(prediction.userId) ?? 0) + (prediction.points ?? 0)
      );
    }
  }
  const totals = [...totalsByUser.entries()].map(([userId, points]) => ({ userId, points }));
  const winners = resolveBountyWinners(totals);
  const nextStatus = winners.length === 0 ? "unclaimed" : "settled";
  const share = winners.length === 0 ? 0 : Math.round((round.payoutAmount / winners.length) * 100) / 100;

  await db.transaction(async (tx) => {
    // The status change is the lock, same claim-the-row pattern as bet
    // settlement: two overlapping runs would otherwise both pay the bounty.
    const claimed = await tx
      .update(bountyRounds)
      .set({ status: nextStatus, settledAt: new Date() })
      .where(and(eq(bountyRounds.id, bountyRoundId), eq(bountyRounds.status, "collecting")))
      .returning({ id: bountyRounds.id });
    if (claimed.length === 0 || winners.length === 0) return;

    await tx.insert(payments).values(
      winners.map((userId) => ({
        direction: "payout_bounty" as const,
        amount: share,
        challengeId: round.challengeId,
        userId,
        status: "pending" as const,
        reference: "Bounty — uitgevallen speler",
      }))
    );
  });
}

/** Scores every prediction on one match, marks it resolved, and settles its round once every match in it is resolved. */
async function resolveBountyRoundMatch(matchId: string, bountyRoundId: string, points: (p: { homeGoals: number; awayGoals: number }) => number) {
  const db = await getDb();
  const predictions = await db.query.bountyPredictions.findMany({
    where: eq(bountyPredictions.bountyRoundMatchId, matchId),
  });

  for (const prediction of predictions) {
    await db.update(bountyPredictions).set({ points: points(prediction) }).where(eq(bountyPredictions.id, prediction.id));
  }

  await db.update(bountyRoundMatches).set({ resolvedAt: new Date() }).where(eq(bountyRoundMatches.id, matchId));

  const stillOpen = await db.$count(
    bountyRoundMatches,
    and(eq(bountyRoundMatches.bountyRoundId, bountyRoundId), isNull(bountyRoundMatches.resolvedAt))
  );
  if (stillOpen === 0) await settleBountyRound(bountyRoundId);
}

/** Called from the results cron right after an event is marked finished — same trigger point as settleScorePredictions. */
export async function settleBountyPredictionsForEvent(eventId: string, homeScore: number, awayScore: number) {
  const db = await getDb();
  const matches = await db.query.bountyRoundMatches.findMany({
    where: and(eq(bountyRoundMatches.eventId, eventId), isNull(bountyRoundMatches.resolvedAt)),
  });
  for (const match of matches) {
    await resolveBountyRoundMatch(match.id, match.bountyRoundId, (p) =>
      scoreBountyPrediction(p, { homeScore, awayScore })
    );
  }
}

/** Called from voidEvent() — a postponed/cancelled fixture still needs to unblock any round waiting on it. Everyone scores 0 on it, same as a miss. */
export async function resolveBountyMatchesForVoidedEvent(eventId: string) {
  const db = await getDb();
  const matches = await db.query.bountyRoundMatches.findMany({
    where: and(eq(bountyRoundMatches.eventId, eventId), isNull(bountyRoundMatches.resolvedAt)),
  });
  for (const match of matches) {
    await resolveBountyRoundMatch(match.id, match.bountyRoundId, () => 0);
  }
}
