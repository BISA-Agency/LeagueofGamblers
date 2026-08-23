import type { Mission } from "@drizzle/schema";

/**
 * A chain is the same mission type at rising thresholds — win 1, 10, 50, 250.
 * Listed flat that is four rows saying almost the same thing, and only one of
 * them is ever the one you are chasing.
 *
 * Rungs are ordered by XP rather than by their parameter, because "harder"
 * is not always "bigger": finishing top 3 and winning outright are the same
 * type with a descending rank. XP is the one measure that runs the right way
 * for every chain in the catalogue, and it needs no per-type table to
 * maintain.
 */
export type ChainRung<M extends Mission = Mission> = {
  mission: M;
  completed: boolean;
  /** null when the type has no countable progress. */
  progress: { current: number; target: number } | null;
};

export type MissionChain<M extends Mission = Mission> = {
  key: string;
  rungs: ChainRung<M>[];
  /** The rung being chased: the first unfinished one, or the last if all are done. */
  active: ChainRung<M>;
  doneCount: number;
  total: number;
  allDone: boolean;
  /** 0–1 toward the active rung, for ordering by "closest to earning". */
  fraction: number;
};

export function buildChains<M extends Mission>(
  entries: ChainRung<M>[]
): MissionChain<M>[] {
  const byType = new Map<string, ChainRung<M>[]>();
  for (const entry of entries) {
    const key = entry.mission.type;
    byType.set(key, [...(byType.get(key) ?? []), entry]);
  }

  const chains: MissionChain<M>[] = [];
  for (const [key, rungs] of byType) {
    rungs.sort((a, b) => (a.mission.rewardXp ?? 0) - (b.mission.rewardXp ?? 0));

    const doneCount = rungs.filter((r) => r.completed).length;
    const active = rungs.find((r) => !r.completed) ?? rungs[rungs.length - 1];
    const allDone = doneCount === rungs.length;

    chains.push({
      key,
      rungs,
      active,
      doneCount,
      total: rungs.length,
      allDone,
      fraction: allDone
        ? 1
        : active.progress && active.progress.target > 0
          ? Math.min(1, active.progress.current / active.progress.target)
          : 0,
    });
  }

  // What you are closest to earning, first. Finished chains sink to the
  // bottom rather than disappearing — they are the record of what you did.
  return chains.sort((a, b) => {
    if (a.allDone !== b.allDone) return a.allDone ? 1 : -1;
    if (b.fraction !== a.fraction) return b.fraction - a.fraction;
    return b.doneCount - a.doneCount;
  });
}
