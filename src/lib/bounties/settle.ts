import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { bountyPredictions, bountyRoundMatches, bountyRounds, payments } from "@drizzle/schema";
import { resolveBountyWinners, scoreBountyPrediction } from "./scoring";

export { resolveBountyWinners, scoreBountyPrediction };

/** Pays out a round: one `payments` row per tied winner, real money, separate from challenge balance. */
async function settleBountyRound(bountyRoundId: string) {
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
  const matches = await db.query.bountyRoundMatches.findMany({
    where: and(eq(bountyRoundMatches.eventId, eventId), isNull(bountyRoundMatches.resolvedAt)),
  });
  for (const match of matches) {
    await resolveBountyRoundMatch(match.id, match.bountyRoundId, () => 0);
  }
}

/**
 * Safety net for rounds whose last match resolved but whose settlement never
 * ran (a cron timeout or a transient DB error between marking the match
 * resolved and paying out). Idempotent: settleBountyRound claims the row.
 */
export async function settleStrandedBountyRounds() {
  const rounds = await db.query.bountyRounds.findMany({
    where: eq(bountyRounds.status, "collecting"),
    with: { matches: { columns: { resolvedAt: true } } },
  });
  for (const round of rounds) {
    if (round.matches.length > 0 && round.matches.every((m) => m.resolvedAt !== null)) {
      await settleBountyRound(round.id);
    }
  }
}
