import { calculatePrizeSplit, type PrizeTierRow } from "@/lib/settlement/payouts";
import type { Challenge, ChallengeParticipant } from "@drizzle/schema";

/** A challenge that hasn't started yet hasn't handed out balances either. */
export function hasStarted(status: string) {
  return status === "live" || status === "settling" || status === "finished";
}

/**
 * What a participant's balance means on screen. Balances are only seeded when
 * the challenge goes live (see runOpenToLiveTransitions), so before that every
 * row sits at 0 in the database — which rendered as "-€10.000" on the
 * leaderboard. Everyone is on the starting balance until the first bet.
 */
export function displayBalance(
  participant: Pick<ChallengeParticipant, "balance" | "status">,
  challenge: Pick<Challenge, "status" | "startingBalance">
): number {
  if (!hasStarted(challenge.status) && participant.status === "joined") {
    return challenge.startingBalance;
  }
  return participant.balance;
}

export type ChallengeStats = {
  joinedCount: number;
  paidCount: number;
  unpaidCount: number;
  pot: number;
  /** Pot if everyone who joined pays — what the group is playing for. */
  potentialPot: number;
  split: { rank: number; amount: number }[];
  maxPlayers: number | null;
};

/**
 * Player count and prize pot, from one place, so the number on the invite
 * page can't disagree with the one in the app. The pot follows the paid
 * players: three payers at €100 is €300, ten is €1000.
 */
export function getChallengeStats(
  challenge: Pick<Challenge, "buyInAmount" | "maxPlayers" | "prizeSplitOverride">,
  participants: Pick<ChallengeParticipant, "paidBuyIn">[],
  prizeTiers: PrizeTierRow[]
): ChallengeStats {
  const joinedCount = participants.length;
  const paidCount = participants.filter((p) => p.paidBuyIn).length;
  const pot = paidCount * challenge.buyInAmount;
  const potentialPot = joinedCount * challenge.buyInAmount;

  const tiers = (challenge.prizeSplitOverride as PrizeTierRow[] | null) ?? prizeTiers;

  return {
    joinedCount,
    paidCount,
    unpaidCount: joinedCount - paidCount,
    pot,
    potentialPot,
    // Split on the paid count, since that's what actually gets paid out.
    split: calculatePrizeSplit(paidCount, pot, tiers),
    maxPlayers: challenge.maxPlayers,
  };
}
