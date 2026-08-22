export type PrizeSplitEntry = { rank: number; percent: number };
export type PrizeTierRow = {
  minPlayers: number;
  maxPlayers: number | null;
  split: PrizeSplitEntry[];
};

/**
 * Picks the applicable staffel for the given paid-player count and turns it
 * into concrete euro amounts (§5.2's "Met 9 betaalde spelers is de pot €900:
 * €450 / €270 / €180" example).
 */
export function calculatePrizeSplit(
  paidPlayerCount: number,
  pot: number,
  tiers: PrizeTierRow[]
): { rank: number; amount: number }[] {
  const tier = tiers.find(
    (t) => paidPlayerCount >= t.minPlayers && (t.maxPlayers === null || paidPlayerCount <= t.maxPlayers)
  );
  if (!tier) return [];

  return tier.split.map((entry) => ({
    rank: entry.rank,
    amount: Math.round(pot * (entry.percent / 100) * 100) / 100,
  }));
}
