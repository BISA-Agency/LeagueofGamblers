import { evaluateBadgesForSettledBet } from "@/lib/badges/triggers";
import { evaluateMissionsForSettledBet } from "@/lib/missions/engine";
import { awardXpForSettledBet } from "@/lib/xp/award";

/**
 * Everything that reacts to a bet leaving "open". Call this instead of the
 * individual evaluators so a new kind of check only has to be wired in once,
 * rather than at every settlement path (auto settlement, admin override,
 * proof-bet self-settlement, proof-bet approval).
 */
export async function runPostSettlementChecks(betId: string) {
  // XP first: a mission that fires off the same bet then lands on top of it,
  // and awardXpForSettledBet skips proof bets until an admin approves them.
  await awardXpForSettledBet(betId);
  await evaluateMissionsForSettledBet(betId);
  await evaluateBadgesForSettledBet(betId);
}
