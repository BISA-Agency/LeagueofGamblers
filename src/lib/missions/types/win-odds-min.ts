import type { MissionTypeDefinition } from "./shared";

export type WinOddsMinParams = { minOdds: number };

export const winOddsMin: MissionTypeDefinition<WinOddsMinParams> = {
  key: "win_odds_min",
  check: (ctx, params) => ctx.bet.status === "won" && ctx.bet.totalOdds >= params.minOdds,
};
