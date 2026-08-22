import type { MissionTypeDefinition } from "./shared";

export const allInWin: MissionTypeDefinition<Record<string, never>> = {
  key: "all_in_win",
  check: (ctx) => ctx.bet.status === "won" && ctx.bet.wasAllIn,
};
