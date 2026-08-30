/**
 * Beyond this many goals for one side, a bookmaker is no longer quoting: a
 * live market came back with 8-0, 9-0, 10-0 and their mirrors all pinned to an
 * identical 151.00, which is a placeholder for "any other score" rather than a
 * real price. Dropping them keeps the grid to the scores people actually bet
 * while leaving every plausible long shot — 5-1 at 46.83 stays.
 */
const MAX_GOALS_PER_SIDE = 7;

/**
 * The Odds API writes a correct-score outcome as "Leeds United:1|Brentford:0".
 * That is unreadable on a bet slip and awkward to settle, so it is normalised
 * at import time to a plain "1-0", always home first.
 *
 * Teams are matched by name rather than by position: the order the provider
 * lists them in is not promised anywhere, and reading it positionally would
 * mirror every score the day that changed.
 *
 * Returns null for anything that should not become a market — unparseable,
 * naming a team that isn't playing, or a scoreline past MAX_GOALS_PER_SIDE.
 */
export function normalizeCorrectScoreLabel(
  raw: string,
  homeTeam: string | undefined,
  awayTeam: string | undefined
): string | null {
  if (!homeTeam || !awayTeam) return null;

  const parts = raw.split("|");
  if (parts.length !== 2) return null;

  const sides = parts.map((part) => {
    const at = part.lastIndexOf(":");
    if (at === -1) return null;
    const team = part.slice(0, at).trim();
    const goals = Number(part.slice(at + 1).trim());
    if (!team || !Number.isInteger(goals) || goals < 0) return null;
    return { team, goals };
  });

  if (sides.some((s) => s === null)) return null;
  const [first, second] = sides as { team: string; goals: number }[];

  const home = [first, second].find((s) => s.team === homeTeam);
  const away = [first, second].find((s) => s.team === awayTeam);
  // An unrecognised team must not silently settle as a score — better no
  // market than a wrong one.
  if (!home || !away || home === away) return null;
  if (home.goals > MAX_GOALS_PER_SIDE || away.goals > MAX_GOALS_PER_SIDE) return null;

  return `${home.goals}-${away.goals}`;
}
