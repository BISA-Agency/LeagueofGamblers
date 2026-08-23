import { and, eq } from "drizzle-orm";
import { logActivity } from "@/lib/activity/log";
import { logAuditEvent } from "@/lib/audit";
import { evaluateEndOfChallengeMissions } from "@/lib/missions/end-of-challenge";
import { awardBadgeBySlug } from "@/lib/badges/award";
import { db } from "@/lib/db";
import { calculatePrizeSplit, type PrizeTierRow } from "@/lib/settlement/payouts";
import {
  bets,
  challengeParticipants,
  challenges,
  payments,
  rankSnapshots,
} from "@drizzle/schema";

export class FinishChallengeError extends Error {}

/**
 * settling -> finished (§5.2). Deliberately not on a cron: this writes
 * payout_prize records for real money, so an admin confirms it once every bet
 * is actually settled. Refuses while open bets remain, because the final
 * ranking would then still be able to change.
 *
 * The payout records land as `pending`; marking them paid stays a separate
 * admin step, same as mission payouts.
 */
export async function finishChallenge(challengeId: string, actorId: string) {
  const challenge = await db.query.challenges.findFirst({
    where: eq(challenges.id, challengeId),
  });
  if (!challenge) throw new FinishChallengeError("Challenge niet gevonden.");
  if (challenge.status !== "settling") {
    throw new FinishChallengeError(
      "Alleen een challenge die wordt afgerond kan afgesloten worden."
    );
  }

  const openBets = await db.query.bets.findMany({
    where: and(eq(bets.challengeId, challengeId), eq(bets.status, "open")),
    columns: { id: true },
  });
  if (openBets.length > 0) {
    throw new FinishChallengeError(
      `Er staan nog ${openBets.length} open bets. Settle die eerst in de sportsbook-queue.`
    );
  }

  const participants = await db.query.challengeParticipants.findMany({
    where: and(
      eq(challengeParticipants.challengeId, challengeId),
      eq(challengeParticipants.paidBuyIn, true)
    ),
  });
  const ranked = [...participants].sort((a, b) => b.balance - a.balance);

  const prizeTierRows = await db.query.prizeTiers.findMany();
  const tiers = ((challenge.prizeSplitOverride as PrizeTierRow[] | null) ??
    prizeTierRows) as PrizeTierRow[];
  const pot = ranked.length * challenge.buyInAmount;
  const split = calculatePrizeSplit(ranked.length, pot, tiers);

  const payouts = split
    .map((entry) => ({ entry, participant: ranked[entry.rank - 1] }))
    .filter((row) => row.participant !== undefined && row.entry.amount > 0);

  await db.transaction(async (tx) => {
    if (payouts.length > 0) {
      await tx.insert(payments).values(
        payouts.map((row) => ({
          direction: "payout_prize" as const,
          amount: row.entry.amount,
          challengeId,
          userId: row.participant.userId,
          status: "pending" as const,
          reference: `Prijs #${row.entry.rank} — ${challenge.name}`,
        }))
      );
    }

    // finalRank freezes the standings; participant status is left alone so a
    // bust player still reads as bust after the challenge closes.
    for (const [index, participant] of ranked.entries()) {
      await tx
        .update(challengeParticipants)
        .set({ finalRank: index + 1 })
        .where(
          and(
            eq(challengeParticipants.challengeId, challengeId),
            eq(challengeParticipants.userId, participant.userId)
          )
        );
    }

    await tx
      .update(challenges)
      .set({ status: "finished", updatedAt: new Date() })
      .where(eq(challenges.id, challengeId));
  });

  await awardEndOfChallengeBadges(challengeId, challenge.startingBalance, ranked);
  // Runs here and nowhere else: half of what these missions judge is the final
  // rank, which only exists now that it has been frozen above.
  await evaluateEndOfChallengeMissions(challengeId);

  await logAuditEvent({
    actorId,
    action: "challenge.transition_finished",
    entityType: "challenge",
    entityId: challengeId,
    after: {
      pot,
      payouts: payouts.map((row) => ({
        rank: row.entry.rank,
        userId: row.participant.userId,
        amount: row.entry.amount,
      })),
    },
  });

  if (ranked[0]) {
    await logActivity(challengeId, ranked[0].userId, "challenge_won", {
      challengeName: challenge.name,
      balance: ranked[0].balance,
    });
  }

  return { pot, payouts: payouts.length, winnerId: ranked[0]?.userId ?? null };
}

type RankedParticipant = { userId: string; balance: number };

async function awardEndOfChallengeBadges(
  challengeId: string,
  startingBalance: number,
  ranked: RankedParticipant[]
) {
  if (ranked[0]) await awardBadgeBySlug("challenge-winner", ranked[0].userId, challengeId);
  for (const participant of ranked.slice(1, 3)) {
    await awardBadgeBySlug("podium", participant.userId, challengeId);
  }

  const snapshots = await db.query.rankSnapshots.findMany({
    where: eq(rankSnapshots.challengeId, challengeId),
  });
  const lastRank = ranked.length;

  for (const [index, participant] of ranked.entries()) {
    const mine = snapshots.filter((s) => s.userId === participant.userId);

    // Iron Bankroll: never dropped under half the starting balance. Judged on
    // the daily snapshots plus the final balance, so an intraday dip that
    // recovered before midnight doesn't disqualify anyone. Documented in
    // DECISIONS.md — a true low-water mark would need a balance ledger.
    const lowest = Math.min(participant.balance, ...mine.map((s) => s.balance));
    if (mine.length > 0 && lowest >= startingBalance / 2) {
      await awardBadgeBySlug("iron-bankroll", participant.userId, challengeId);
    }

    // Comeback: sat in last place at some point and still finished top 3.
    if (index < 3 && mine.some((s) => s.rank === lastRank) && lastRank >= 3) {
      await awardBadgeBySlug("comeback", participant.userId, challengeId);
    }
  }

  // Veteran is a career badge: three challenges played through to the end.
  for (const participant of ranked) {
    const played = await db.query.challengeParticipants.findMany({
      where: and(
        eq(challengeParticipants.userId, participant.userId),
        eq(challengeParticipants.paidBuyIn, true)
      ),
      with: { challenge: { columns: { status: true } } },
    });
    if (played.filter((p) => p.challenge.status === "finished").length >= 3) {
      await awardBadgeBySlug("veteran", participant.userId, null);
    }
  }
}
