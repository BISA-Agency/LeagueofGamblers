/**
 * Turns a correct-score market into two rows of goal tallies.
 *
 * A bookmaker quotes forty-odd exact scores, which as a wall of buttons is
 * unreadable. Picking a tally per side is how a betting shop has always laid
 * this out: one row for the home goals, one for the away, and the price
 * appears once both are chosen.
 *
 * Rows count up from zero without gaps even when the bookmaker skipped a
 * tally, so the two rows stay aligned and a missing price reads as a gap
 * rather than shifting everything along.
 */
export type ScoreGrid = {
  home: number[];
  away: number[];
  /** Whether this home tally can still lead to a quoted score. */
  homeAvailable: (goals: number) => boolean;
  awayAvailable: (goals: number) => boolean;
  /** "2-1" once both sides are chosen, else null. */
  label: string | null;
};

function parse(labels: string[]): { home: number; away: number }[] {
  return labels
    .map((l) => /^(\d+)-(\d+)$/.exec(l.trim()))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => ({ home: Number(m[1]), away: Number(m[2]) }));
}

function upTo(max: number): number[] {
  return Array.from({ length: max + 1 }, (_, i) => i);
}

export function buildScoreGrid(
  labels: string[],
  homePick: number | null,
  awayPick: number | null
): ScoreGrid {
  const scores = parse(labels);

  const maxHome = scores.reduce((m, s) => Math.max(m, s.home), 0);
  const maxAway = scores.reduce((m, s) => Math.max(m, s.away), 0);

  // A tally stays selectable if some quoted score pairs it with whatever the
  // other side currently holds — so picking one row filters the other, and
  // clearing it opens everything back up.
  const homeAvailable = (goals: number) =>
    scores.some((s) => s.home === goals && (awayPick === null || s.away === awayPick));
  const awayAvailable = (goals: number) =>
    scores.some((s) => s.away === goals && (homePick === null || s.home === homePick));

  const both = homePick !== null && awayPick !== null;
  const exists = both && scores.some((s) => s.home === homePick && s.away === awayPick);

  return {
    home: upTo(maxHome),
    away: upTo(maxAway),
    homeAvailable,
    awayAvailable,
    label: exists ? `${homePick}-${awayPick}` : null,
  };
}
