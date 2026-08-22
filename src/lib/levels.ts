export type LevelInfo = {
  level: number;
  title: string;
  xpIntoLevel: number;
  xpForNextLevel: number | null; // null = max level
};

// XP thresholds are cumulative: level N starts at LEVEL_THRESHOLDS[N-1] XP.
const LEVEL_TITLES = ["Rookie", "Punter", "Grinder", "Sharp", "Whale", "Legend"];
const LEVEL_THRESHOLDS = [0, 100, 300, 700, 1500, 3000];

export function getLevelInfo(xp: number): LevelInfo {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }

  const currentThreshold = LEVEL_THRESHOLDS[level - 1];
  const nextThreshold = LEVEL_THRESHOLDS[level] ?? null;

  return {
    level,
    title: LEVEL_TITLES[level - 1],
    xpIntoLevel: xp - currentThreshold,
    xpForNextLevel: nextThreshold === null ? null : nextThreshold - currentThreshold,
  };
}
