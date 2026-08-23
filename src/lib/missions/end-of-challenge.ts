import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { alreadyCompleted, awardMission } from "@/lib/missions/engine";
import { bets, challengeParticipants, challenges, rankSnapshots } from "@drizzle/schema";

/**
 * The fourth evaluation channel: missions that can only be judged once a
 * challenge is over.
 *
 * Per-bet checks cannot answer "did you get through the month without going
 * all-in" — the answer is only ever "not yet" until the last bet settles. Nor
 * can they see a final rank. These run once, from finishChallenge.
 */
export type EndOfChallengeFacts = {
  finalRank: number | null;
  finalBalance: number;
  startingBalance: number;
  /** Lowest balance the nightly snapshots ever recorded this challenge. */
  lowestBalance: number | null;
  wentAllIn: boolean;
  /** Finished challenges this player has taken part in, including this one. */
  challengesPlayed: number;
  /** Most bets settled on any single day of this challenge. */
  busiestDay: number;
};

type Check = (facts: EndOfChallengeFacts, params: Record<string, number>) => boolean;

const CHECKS: Record<string, Check> = {
  /** Top N of the final standings. */
  challenge_finish_top: (f, p) => f.finalRank !== null && f.finalRank <= (p.rank ?? 3),

  /** Loyalty chain: 1 → 3 → 12 challenges seen through. */
  challenges_played: (f, p) => f.challengesPlayed >= (p.count ?? 1),

  /**
   * A month without a single all-in. The counterweight to the missions that
   * reward risk — with real money in the pot, something has to pay for
   * restraint too.
   */
  no_all_in: (f) => !f.wentAllIn,

  /** Never exceeded N bets on any day. Discipline, not volume. */
  max_daily_bets: (f, p) => f.busiestDay > 0 && f.busiestDay <= (p.max ?? 3),

  /** Dropped under a threshold and still finished at or above the start. */
  comeback: (f, p) =>
    f.lowestBalance !== null &&
    f.lowestBalance < (p.below ?? 2000) &&
    f.finalBalance >= f.startingBalance,
};

export const END_OF_CHALLENGE_TYPES = Object.keys(CHECKS);

async function gatherFacts(
  challengeId: string,
  userId: string,
  startingBalance: number
): Promise<EndOfChallengeFacts> {
  const participant = await db.query.challengeParticipants.findFirst({
    where: and(
      eq(challengeParticipants.challengeId, challengeId),
      eq(challengeParticipants.userId, userId)
    ),
  });

  const settled = await db.query.bets.findMany({
    where: and(
      eq(bets.challengeId, challengeId),
      eq(bets.userId, userId),
      ne(bets.status, "open")
    ),
    columns: { wasAllIn: true, settledAt: true },
  });

  const perDay = new Map<string, number>();
  for (const bet of settled) {
    if (!bet.settledAt) continue;
    const day = bet.settledAt.toISOString().slice(0, 10);
    perDay.set(day, (perDay.get(day) ?? 0) + 1);
  }

  const snapshots = await db.query.rankSnapshots.findMany({
    where: and(eq(rankSnapshots.challengeId, challengeId), eq(rankSnapshots.userId, userId)),
    columns: { balance: true },
  });

  const played = await db.query.challengeParticipants.findMany({
    where: eq(challengeParticipants.userId, userId),
    with: { challenge: { columns: { status: true } } },
  });

  return {
    finalRank: participant?.finalRank ?? null,
    finalBalance: participant?.balance ?? 0,
    startingBalance,
    lowestBalance: snapshots.length > 0 ? Math.min(...snapshots.map((s) => s.balance)) : null,
    wentAllIn: settled.some((b) => b.wasAllIn),
    challengesPlayed: played.filter((p) => p.challenge.status === "finished").length,
    busiestDay: perDay.size > 0 ? Math.max(...perDay.values()) : 0,
  };
}

/**
 * Runs every end-of-challenge mission for every participant. Called once from
 * finishChallenge, after final ranks are frozen — the ranks are half the
 * facts, so running it any earlier would judge on nothing.
 */
export async function evaluateEndOfChallengeMissions(challengeId: string) {
  const challenge = await db.query.challenges.findFirst({
    where: eq(challenges.id, challengeId),
    columns: { startingBalance: true },
  });
  if (!challenge) return;

  const relevant = (
    await db.query.missions.findMany({
      where: (m, { isNull, or, eq: eqOp }) =>
        or(isNull(m.challengeId), eqOp(m.challengeId, challengeId)),
    })
  ).filter((m) => END_OF_CHALLENGE_TYPES.includes(m.type));
  if (relevant.length === 0) return;

  const participants = await db.query.challengeParticipants.findMany({
    where: eq(challengeParticipants.challengeId, challengeId),
    columns: { userId: true },
  });

  for (const { userId } of participants) {
    const facts = await gatherFacts(challengeId, userId, challenge.startingBalance);

    for (const mission of relevant) {
      const check = CHECKS[mission.type];
      if (!check) continue;
      if (!check(facts, (mission.params ?? {}) as Record<string, number>)) continue;
      if (await alreadyCompleted(mission, userId, challengeId)) continue;

      await awardMission(mission, userId, challengeId, null);
    }
  }
}

/** Registered for validation and the admin picker; evaluated here, not per bet. */
export function isEndOfChallengeType(type: string): boolean {
  return END_OF_CHALLENGE_TYPES.includes(type);
}
