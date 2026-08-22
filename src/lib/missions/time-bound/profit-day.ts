import type { TimeBoundMissionTypeDefinition } from "./shared";

export type ProfitDayParams = { minPercent: number };

export const profitDay: TimeBoundMissionTypeDefinition<ProfitDayParams> = {
  key: "profit_day",
  check: (ctx, params) => {
    if (ctx.snapshots.length < 2) return false;
    const yesterday = ctx.snapshots[ctx.snapshots.length - 2].balance;
    if (yesterday <= 0) return false;
    const percent = ((ctx.currentBalance - yesterday) / yesterday) * 100;
    return percent >= params.minPercent;
  },
};
