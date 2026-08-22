import { evaluateBadgesForSettledBet } from "@/lib/badges/triggers";
import { evaluateMissionsForSettledBet } from "@/lib/missions/engine";

/**
 * Everything that reacts to a bet leaving "open". Call this instead of the
 * individual evaluators so a new kind of check only has to be wired in once,
 * rather than at every settlement path (auto settlement, admin override,
 * proof-bet self-settlement, proof-bet approval).
 */
export async function runPostSettlementChecks(betId: string) {
  await evaluateMissionsForSettledBet(betId);
  await evaluateBadgesForSettledBet(betId);
}
