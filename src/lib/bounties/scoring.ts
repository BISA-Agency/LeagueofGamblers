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
