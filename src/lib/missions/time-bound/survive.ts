import type { TimeBoundMissionTypeDefinition } from "./shared";

export type SurviveParams = { minPercent: number; window: number };

export const survive: TimeBoundMissionTypeDefinition<SurviveParams> = {
  key: "survive",
  check: (ctx, params) => {
    const threshold = ctx.startingBalance * (params.minPercent / 100);
    const inWindow = ctx.snapshots.slice(-params.window);
    if (inWindow.length < params.window) return false; // not enough history yet
    return inWindow.every((s) => s.balance >= threshold);
  },
};
