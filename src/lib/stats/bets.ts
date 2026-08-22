import type { Bet, BetSelection } from "@drizzle/schema";

export type BetWithSelections = Bet & { selections: BetSelection[] };

const WON = new Set(["won", "half_won"]);

/** What a settled bet actually returned to the player, minus what it cost. */
export function profitOf(bet: Bet): number {
  switch (bet.status) {
    case "won":
      return bet.potentialPayout - bet.stake;
    case "half_won":
      return (bet.potentialPayout - bet.stake) / 2;
    case "half_lost":
      return -bet.stake / 2;
    case "lost":
      return -bet.stake;
    default:
      return 0;
  }
}

export type BetSummary = {
  betsCount: number;
  openCount: number;
  /** Money currently locked in open bets — deducted from balance at placement,
   * but not lost, so P/L calculations must add it back. */
  openStake: number;
  settledCount: number;
  wonCount: number;
  winrate: number;
  avgOdds: number;
  highestWonOdds: number;
  biggestWin: number;
  biggestLoss: number;
  totalStaked: number;
  longestWinStreak: number;
  combiCount: number;
  singleCount: number;
  favoriteSport: string | null;
};

/**
 * One place for every bet-derived number shown to players (profile,
 * head-to-head, wrapped). Void bets are excluded from settled counts: they
 * were refunded, so counting them would drag the winrate down for something
 * that never resolved.
 */
export function summarizeBets(playerBets: BetWithSelections[]): BetSummary {
  const settled = playerBets.filter((b) => b.status !== "open" && b.status !== "void");
  const won = settled.filter((b) => WON.has(b.status));
  const profits = settled.map(profitOf);

  let streak = 0;
  let longestWinStreak = 0;
  // settled arrives newest-first from most callers, but streak length is
  // order-independent as long as we walk it consistently.
  for (const bet of settled) {
    if (WON.has(bet.status)) {
      streak += 1;
      longestWinStreak = Math.max(longestWinStreak, streak);
    } else {
      streak = 0;
    }
  }

  const sportCounts = new Map<string, number>();
  for (const bet of playerBets) {
    for (const s of bet.selections) {
      sportCounts.set(s.sport, (sportCounts.get(s.sport) ?? 0) + 1);
    }
  }
  const favorite = [...sportCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    betsCount: playerBets.length,
    openCount: playerBets.filter((b) => b.status === "open").length,
    openStake: playerBets
      .filter((b) => b.status === "open")
      .reduce((sum, b) => sum + b.stake, 0),
    settledCount: settled.length,
    wonCount: won.length,
    winrate: settled.length > 0 ? (won.length / settled.length) * 100 : 0,
    avgOdds:
      playerBets.length > 0
        ? playerBets.reduce((sum, b) => sum + b.totalOdds, 0) / playerBets.length
        : 0,
    highestWonOdds: won.length > 0 ? Math.max(...won.map((b) => b.totalOdds)) : 0,
    biggestWin: profits.length > 0 ? Math.max(0, ...profits) : 0,
    biggestLoss: profits.length > 0 ? Math.min(0, ...profits) : 0,
    totalStaked: playerBets.reduce((sum, b) => sum + b.stake, 0),
    longestWinStreak,
    combiCount: playerBets.filter((b) => b.type === "combi").length,
    singleCount: playerBets.filter((b) => b.type === "single").length,
    favoriteSport: favorite?.[0] ?? null,
  };
}
