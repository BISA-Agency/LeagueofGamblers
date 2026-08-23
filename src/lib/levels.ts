/**
 * Six named tiers of ten levels each, so progression rings a bell sixty times
 * instead of six. Thresholds come from a formula rather than a table: the
 * curve can be retuned later without a migration, and everyone shifts with it.
 *
 * Cost of the step from level L to L+1 is 100 + 15L, so the first levels come
 * in days and Legend 10 is a multi-year target. At roughly 800 XP a month
 * (see lib/xp/award.ts for where that comes from): Punter in ~2 months,
 * Sharp around a year, Legend 10 near three and a half.
 */
export const TIERS = ["Rookie", "Punter", "Grinder", "Sharp", "Whale", "Legend"] as const;
export type Tier = (typeof TIERS)[number];

export const LEVELS_PER_TIER = 10;
export const MAX_LEVEL = TIERS.length * LEVELS_PER_TIER;

export type LevelInfo = {
  /** 1 … MAX_LEVEL */
  level: number;
  tier: Tier;
  /** 0-based, handy for picking an emblem. */
  tierIndex: number;
  /** 1 … LEVELS_PER_TIER — the number shown after the tier name. */
  levelInTier: number;
  /** "Grinder 7" */
  label: string;
  xpIntoLevel: number;
  /** null at max level. */
  xpForNextLevel: number | null;
};

/** Total XP needed to stand at this level. Level 1 is 0. */
export function xpForLevel(level: number): number {
  const n = Math.max(0, Math.min(level, MAX_LEVEL) - 1);
  return 100 * n + (15 * n * (n + 1)) / 2;
}

/** Highest level this much XP reaches, ignoring the floor. */
export function levelFromXp(xp: number): number {
  let level = 1;
  while (level < MAX_LEVEL && xp >= xpForLevel(level + 1)) level++;
  return level;
}

/**
 * @param xp        current XP, which can go down
 * @param levelFloor highest level ever reached; a bad run never demotes you,
 *                   because a system that takes progress back stops people
 *                   playing long before it makes them careful.
 */
export function getLevelInfo(xp: number, levelFloor = 1): LevelInfo {
  const level = Math.max(levelFromXp(xp), Math.max(1, Math.min(levelFloor, MAX_LEVEL)));
  const tierIndex = Math.min(TIERS.length - 1, Math.floor((level - 1) / LEVELS_PER_TIER));
  const levelInTier = level - tierIndex * LEVELS_PER_TIER;

  const floor = xpForLevel(level);
  const ceiling = level >= MAX_LEVEL ? null : xpForLevel(level + 1);

  return {
    level,
    tier: TIERS[tierIndex],
    tierIndex,
    levelInTier,
    label: `${TIERS[tierIndex]} ${levelInTier}`,
    // Clamped: someone held up by the floor can sit below their level's own
    // threshold, and a negative bar reads as broken.
    xpIntoLevel: Math.max(0, xp - floor),
    xpForNextLevel: ceiling === null ? null : ceiling - floor,
  };
}
