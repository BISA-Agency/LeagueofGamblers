import type { SettlementOutcome } from "./markets";

export type BetDecision = "pending" | "lost" | "void" | "won";

/**
 * What a bet is, given the state of its legs — the rule on its own, away from
 * the database work that acts on it.
 *
 * The part worth stating plainly: a combi is lost the moment one leg loses.
 * Nothing the remaining matches do can bring it back, so there is no reason to
 * make anyone wait until Sunday evening to be told what Saturday afternoon
 * already decided. Everything else does need every leg in — a win cannot be
 * paid until the last price is known, and a void refund cannot be given while
 * a leg might still lose.
 *
 * half_lost counts as lost here, matching how a combi is valued elsewhere in
 * this app: split-stake Asian-handicap combis are out of scope, so half a
 * losing leg loses the bet.
 */
export function decideBet(
  selections: { result: SettlementOutcome | null }[]
): BetDecision {
  if (selections.length === 0) return "pending";

  if (selections.some((s) => s.result === "lost" || s.result === "half_lost")) return "lost";

  // Past here nothing has lost, so the answer waits on the legs still open.
  if (selections.some((s) => s.result === null)) return "pending";

  // Every leg voided — an abandoned card, say. The stake goes back.
  if (selections.every((s) => s.result === "void")) return "void";

  return "won";
}
