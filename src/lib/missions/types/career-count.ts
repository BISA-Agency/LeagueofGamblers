import type { MissionTypeDefinition } from "./shared";

export type CountParams = { count: number };

/** Chains like 1 → 10 → 50 → 250 wins. Career-wide, so they never reset. */
export const winCount: MissionTypeDefinition<CountParams> = {
  key: "win_count",
  needsCareer: true,
  check: (ctx, params) => (ctx.career?.wonBets ?? 0) >= params.count,
};

/** Rewards turning up, not being right. The backbone of the long chains. */
export const betsSettled: MissionTypeDefinition<CountParams> = {
  key: "bets_settled",
  needsCareer: true,
  check: (ctx, params) => (ctx.career?.settledBets ?? 0) >= params.count,
};

/** Distinct sports won in — nudges people out of only betting football. */
export const sportsVariety: MissionTypeDefinition<CountParams> = {
  key: "sports_variety",
  needsCareer: true,
  check: (ctx, params) => (ctx.career?.sportsWon ?? 0) >= params.count,
};

export type WinrateParams = { percent: number; minBets: number };

/**
 * Career winrate over a minimum sample. The minimum is the whole point: over
 * five bets anyone can show 80%, so a mission without it rewards luck and
 * fires on the first lucky streak of someone's life.
 */
export const winrateMin: MissionTypeDefinition<WinrateParams> = {
  key: "winrate_min",
  needsCareer: true,
  check: (ctx, params) => {
    const settled = ctx.career?.settledBets ?? 0;
    if (settled < params.minBets) return false;
    return ((ctx.career?.wonBets ?? 0) / settled) * 100 >= params.percent;
  },
};
