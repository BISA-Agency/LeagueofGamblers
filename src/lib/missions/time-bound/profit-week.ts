import type { TimeBoundMissionTypeDefinition } from "./shared";

export type ProfitWeekParams = { minPercent: number };

export const profitWeek: TimeBoundMissionTypeDefinition<ProfitWeekParams> = {
  key: "profit_week",
  check: (ctx, params) => {
    if (ctx.snapshots.length < 2) return false;
    const weekAgoIndex = Math.max(0, ctx.snapshots.length - 1 - 7);
    const weekAgo = ctx.snapshots[weekAgoIndex].balance;
    if (weekAgo <= 0) return false;
    const percent = ((ctx.currentBalance - weekAgo) / weekAgo) * 100;
    return percent >= params.minPercent;
  },
};
