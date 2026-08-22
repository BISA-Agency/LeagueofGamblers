import type { MissionTypeDefinition } from "./shared";

export type UnderdogParams = { minOdds: number; sport: string };

export const underdog: MissionTypeDefinition<UnderdogParams> = {
  key: "underdog",
  check: (ctx, params) =>
    ctx.bet.status === "won" &&
    ctx.bet.totalOdds >= params.minOdds &&
    ctx.bet.selections.some((s) => s.sport.toLowerCase() === params.sport.toLowerCase()),
};
