import type { MissionTypeDefinition } from "./shared";

export type WinStreakParams = { count: number };

export const winStreak: MissionTypeDefinition<WinStreakParams> = {
  key: "win_streak",
  needsHistory: true,
  check: (ctx, params) => {
    if (ctx.recentSettledBets.length < params.count) return false;
    return ctx.recentSettledBets.slice(0, params.count).every((b) => b.status === "won");
  },
};
