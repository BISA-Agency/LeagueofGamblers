import type { TimeBoundMissionTypeDefinition } from "./shared";

export type VolumeParams = { count: number; window: number };

export const volume: TimeBoundMissionTypeDefinition<VolumeParams> = {
  key: "volume",
  check: (ctx, params) => ctx.betCountInWindow(params.window) >= params.count,
};
