import { combiWin } from "./combi-win";
import type { MissionTypeDefinition } from "./shared";
import { winOddsMin } from "./win-odds-min";
import { winStreak } from "./win-streak";

export type { MissionCheckContext, MissionTypeDefinition } from "./shared";

// "manual" is deliberately absent — the admin awards it directly, it's
// never auto-evaluated. New automatic types register here (§5.7: adding a
// type means adding a file + one registry line, not a new `if` branch).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const MISSION_TYPES: Record<string, MissionTypeDefinition<any>> = {
  [winOddsMin.key]: winOddsMin,
  [combiWin.key]: combiWin,
  [winStreak.key]: winStreak,
};
