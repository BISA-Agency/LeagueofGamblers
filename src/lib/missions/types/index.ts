import { allInWin } from "./all-in-win";
import { balanceReach } from "./balance-reach";
import { combiWin } from "./combi-win";
import { referrals } from "./referrals";
import type { MissionTypeDefinition } from "./shared";
import { sportWin } from "./sport-win";
import { underdog } from "./underdog";
import { winOddsMin } from "./win-odds-min";
import { winStreak } from "./win-streak";

export type { MissionCheckContext, MissionTypeDefinition } from "./shared";

// "manual" is deliberately absent — the admin awards it directly, it's
// never auto-evaluated. profit_day/profit_week/survive/volume live in
// lib/missions/time-bound.ts instead — they're evaluated daily by cron, not
// per-settlement, so they don't fit this registry's check() signature.
// New per-bet types register here (§5.7: adding a type means adding a file +
// one registry line, not a new `if` branch).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const MISSION_TYPES: Record<string, MissionTypeDefinition<any>> = {
  [winOddsMin.key]: winOddsMin,
  [combiWin.key]: combiWin,
  [winStreak.key]: winStreak,
  [sportWin.key]: sportWin,
  [underdog.key]: underdog,
  [balanceReach.key]: balanceReach,
  [allInWin.key]: allInWin,
  // Registered so it validates and shows in the picker; evaluated by
  // lib/referrals/evaluate.ts, not by this registry.
  [referrals.key]: referrals,
};
