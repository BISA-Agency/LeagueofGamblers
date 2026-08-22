import { profitDay } from "./profit-day";
import { profitWeek } from "./profit-week";
import type { TimeBoundMissionTypeDefinition } from "./shared";
import { survive } from "./survive";
import { volume } from "./volume";

export type { TimeBoundContext, TimeBoundMissionTypeDefinition } from "./shared";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TIME_BOUND_MISSION_TYPES: Record<string, TimeBoundMissionTypeDefinition<any>> = {
  [profitDay.key]: profitDay,
  [profitWeek.key]: profitWeek,
  [survive.key]: survive,
  [volume.key]: volume,
};
