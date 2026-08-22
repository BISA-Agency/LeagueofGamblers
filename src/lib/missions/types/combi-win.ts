import type { MissionTypeDefinition } from "./shared";

export type CombiWinParams = { minSelections: number };

export const combiWin: MissionTypeDefinition<CombiWinParams> = {
  key: "combi_win",
  check: (ctx, params) =>
    ctx.bet.status === "won" &&
    ctx.bet.type === "combi" &&
    ctx.bet.selections.length >= params.minSelections,
};
