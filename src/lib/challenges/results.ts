import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { calculatePrizeSplit, type PrizeTierRow } from "@/lib/settlement/payouts";
import { challengeParticipants, challenges, payments, prizeTiers } from "@drizzle/schema";

export type ChallengeResultRow = {
  rank: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  country: string | null;
  xp: number;
  levelFloor: number;
  balance: number;
  /** Balance minus what everyone started with. Negative is a losing month. */
  profit: number;
  /** Share of the pot, in real euros. */
  prize: number;
  /** Real euros won from the challenge's mission budget. */
  missionEarnings: number;
  isBust: boolean;
};

export type ChallengeResults = {
  challengeName: string;
  rows: ChallengeResultRow[];
  startingBalance: number;
  pot: number;
  prizeTotal: number;
  missionTotal: number;
  /**
   * False when the challenge hasn't actually finished — the standings are
   * real, but the prizes are what *would* be paid if it ended now. The admin
   * preview leans on this; nothing player-facing ever renders it.
   */
  final: boolean;
};

/**
 * Everything the end-of-challenge screen shows, from one place.
 *
 * Works before the finish too, which is the whole reason it computes rather
 * than only reads. Once finishChallenge has run, the ranking and the prize
 * rows are facts in the database and this reports them. Before that there is
 * nothing to report, so it ranks by balance and runs the same prize split
 * finishChallenge would — otherwise a preview would show every prize as zero
 * and be useless for checking the thing you actually want to check.
 *
 * Mission money is read from the payment rows either way: those are written
 * as missions complete, all month long, and are already real.
 */
export async function getChallengeResults(challengeId: string): Promise<ChallengeResults | null> {
  const challenge = await db.query.challenges.findFirst({
    where: eq(challenges.id, challengeId),
  });
  if (!challenge) return null;

  // Only paid participants: an unpaid entry is not in the running and must
  // not take up a prize rank.
  const participants = await db.query.challengeParticipants.findMany({
    where: and(
      eq(challengeParticipants.challengeId, challengeId),
      eq(challengeParticipants.paidBuyIn, true)
    ),
    with: { user: true },
  });

  const payoutRows = await db.query.payments.findMany({
    where: and(
      eq(payments.challengeId, challengeId),
      inArray(payments.direction, ["payout_prize", "payout_mission"])
    ),
    columns: { direction: true, amount: true, userId: true },
  });

  const missionByUser = new Map<string, number>();
  const prizeByUser = new Map<string, number>();
  for (const row of payoutRows) {
    const target = row.direction === "payout_mission" ? missionByUser : prizeByUser;
    target.set(row.userId, (target.get(row.userId) ?? 0) + row.amount);
  }

  const final = challenge.status === "finished";

  // finalRank is frozen at the finish and is the authority from then on.
  // Before that, the live ranking is simply the balance order.
  const ordered = [...participants].sort((a, b) => {
    if (final && a.finalRank !== null && b.finalRank !== null) return a.finalRank - b.finalRank;
    return b.balance - a.balance;
  });

  const pot = ordered.length * challenge.buyInAmount;

  if (!final) {
    const tierRows = await db.query.prizeTiers.findMany({ orderBy: prizeTiers.minPlayers });
    const tiers = ((challenge.prizeSplitOverride as PrizeTierRow[] | null) ??
      tierRows) as PrizeTierRow[];
    for (const [index, entry] of calculatePrizeSplit(ordered.length, pot, tiers).entries()) {
      const participant = ordered[index];
      if (participant && entry.amount > 0) prizeByUser.set(participant.userId, entry.amount);
    }
  }

  const rows: ChallengeResultRow[] = ordered.map((p, index) => ({
    rank: final ? (p.finalRank ?? index + 1) : index + 1,
    userId: p.userId,
    username: p.user.username,
    avatarUrl: p.user.avatarUrl,
    country: p.user.country,
    xp: p.user.xp,
    levelFloor: p.user.levelFloor,
    balance: p.balance,
    profit: p.balance - challenge.startingBalance,
    prize: prizeByUser.get(p.userId) ?? 0,
    missionEarnings: missionByUser.get(p.userId) ?? 0,
    isBust: p.status === "bust",
  }));

  return {
    challengeName: challenge.name,
    rows,
    startingBalance: challenge.startingBalance,
    pot,
    prizeTotal: rows.reduce((sum, r) => sum + r.prize, 0),
    missionTotal: rows.reduce((sum, r) => sum + r.missionEarnings, 0),
    final,
  };
}
