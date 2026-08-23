import type { Bet, BetSelection, Mission } from "@drizzle/schema";

export type MissionProgressContext = {
  /** All of the player's bets in this challenge, newest first. */
  bets: (Bet & { selections: BetSelection[] })[];
  currentBalance: number;
  startingBalance: number;
  /**
   * Lifetime totals. The career chains run to 2000 bets across every
   * challenge, so a bar drawn from this challenge's bets alone would be wrong
   * — and would reset to zero every month, which is the opposite of what a
   * career chain promises.
   */
  career: {
    settledBets: number;
    wonBets: number;
    sportsWon: number;
    challengesFinished: number;
    referralsConfirmed: number;
  };
};

export type MissionProgress = { current: number; target: number };

const WON = new Set(["won", "half_won"]);

/**
 * A registry rather than a switch, matching lib/missions/types (§5.7).
 *
 * Only counting missions appear here. The rest ("win a bet at odds >= 20",
 * "win an all-in") are pass/fail: there is no partial state to show, and a
 * bar stuck at 0% until it snaps to 100% is worse than no bar at all.
 */
export const MISSION_PROGRESS: Record<
  string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (ctx: MissionProgressContext, params: any) => MissionProgress | null
> = {
  win_count: (ctx, params: { count: number }) => ({
    current: Math.min(ctx.career.wonBets, params.count),
    target: params.count,
  }),

  bets_settled: (ctx, params: { count: number }) => ({
    current: Math.min(ctx.career.settledBets, params.count),
    target: params.count,
  }),

  sports_variety: (ctx, params: { count: number }) => ({
    current: Math.min(ctx.career.sportsWon, params.count),
    target: params.count,
  }),

  challenges_played: (ctx, params: { count: number }) => ({
    current: Math.min(ctx.career.challengesFinished, params.count),
    target: params.count,
  }),

  referrals: (ctx, params: { count: number }) => ({
    current: Math.min(ctx.career.referralsConfirmed, params.count),
    target: params.count,
  }),

  /**
   * Progress toward the sample size, not toward the percentage. Until you have
   * enough bets the mission is unreachable whatever your winrate, so that is
   * the honest thing to count; once you are over the line the bar is full and
   * only the rate decides.
   */
  winrate_min: (ctx, params: { minBets: number }) => ({
    current: Math.min(ctx.career.settledBets, params.minBets),
    target: params.minBets,
  }),

  win_streak: (ctx, params: { count: number }) => {
    let streak = 0;
    for (const bet of ctx.bets.filter((b) => b.status !== "open" && b.status !== "void")) {
      if (bet.status === "won") streak += 1;
      else break;
    }
    return { current: Math.min(streak, params.count), target: params.count };
  },

  sport_win: (ctx, params: { sport: string; count: number }) => {
    const wins = ctx.bets.filter(
      (b) =>
        WON.has(b.status) &&
        b.selections.some((s) => s.sport.toLowerCase() === String(params.sport).toLowerCase())
    ).length;
    return { current: Math.min(wins, params.count), target: params.count };
  },

  balance_reach: (ctx, params: { amount: number }) => {
    const from = ctx.startingBalance;
    const target = params.amount;
    // Measure the climb from the starting balance, not from zero — otherwise
    // everyone starts the mission apparently 80% done.
    if (target <= from) return null;
    const gained = Math.max(0, ctx.currentBalance - from);
    return { current: Math.min(gained, target - from), target: target - from };
  },

  volume: (ctx, params: { count: number; window: number }) => {
    const since = Date.now() - Number(params.window) * 86_400_000;
    const placed = ctx.bets.filter((b) => b.placedAt.getTime() >= since).length;
    return { current: Math.min(placed, params.count), target: params.count };
  },
};

export function getMissionProgress(
  mission: Mission,
  ctx: MissionProgressContext
): MissionProgress | null {
  const fn = MISSION_PROGRESS[mission.type];
  if (!fn) return null;
  try {
    const result = fn(ctx, mission.params as Record<string, unknown>);
    if (!result || !Number.isFinite(result.target) || result.target <= 0) return null;
    return result;
  } catch {
    // A mission row with malformed params shouldn't take the page down.
    return null;
  }
}
