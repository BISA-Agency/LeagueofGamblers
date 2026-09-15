/**
 * A Fisher-Yates shuffle, capped at `count`. Takes an injectable random
 * source so the selection is deterministically testable; production callers
 * use the default Math.random.
 */
export function pickRandomMatches<T>(pool: T[], count: number, random: () => number = Math.random): T[] {
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}
