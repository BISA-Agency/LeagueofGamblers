import type { MissionTypeDefinition } from "./shared";

export type SportWinParams = { sport: string; count: number };

function isAllInSport(selections: { sport: string }[], sport: string) {
  return selections.length > 0 && selections.every((s) => s.sport.toLowerCase() === sport.toLowerCase());
}

export const sportWin: MissionTypeDefinition<SportWinParams> = {
  key: "sport_win",
  needsHistory: true,
  check: (ctx, params) => {
    const matching = ctx.recentSettledBets.filter(
      (b) =>
        (b.status === "won" || b.status === "half_won") && isAllInSport(b.selections, params.sport)
    );
    return matching.length >= params.count;
  },
};
