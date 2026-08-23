import type { Market, Outcome } from "@drizzle/schema";

/**
 * Puts a market's outcomes in the order people expect, every single time.
 *
 * Bookmakers hand them over in whatever order they please — a real import
 * returned "1 2 X" for one Serie A match and "2 1 X" for another in the same
 * list. On a betting page that is not untidiness: the buttons move under the
 * thumb between one card and the next, and a mis-tap costs money.
 *
 * Nothing guarantees the database returns rows in insertion order either, so
 * the ordering is imposed here, at the point of display, rather than hoped for
 * upstream.
 */
export function orderOutcomes<T extends Outcome>(
  market: Pick<Market, "type" | "team">,
  outcomes: T[],
  event: { homeTeam?: string | null; awayTeam?: string | null }
): T[] {
  const rank = rankerFor(market, event);
  if (!rank) return outcomes;

  return [...outcomes].sort((a, b) => {
    const ra = rank(a.label);
    const rb = rank(b.label);
    // Anything unrecognised keeps to the back rather than jumping the queue.
    return (ra === -1 ? 99 : ra) - (rb === -1 ? 99 : rb);
  });
}

function rankerFor(
  market: Pick<Market, "type" | "team">,
  event: { homeTeam?: string | null; awayTeam?: string | null }
): ((label: string) => number) | null {
  const home = event.homeTeam ?? "";
  const away = event.awayTeam ?? "";

  switch (market.type) {
    // 1 X 2 — the order every bookmaker and every coupon in the world uses.
    case "h2h":
      return (label) => [home, "Draw", away].indexOf(label);

    case "spreads":
    case "draw_no_bet":
      return (label) => [home, away].indexOf(label);

    case "totals":
    case "team_totals":
      return (label) => ["Over", "Under"].indexOf(label);

    case "btts":
      return (label) => ["Yes", "No"].indexOf(label);

    // 1X, 12, X2: home involved first, then the pair without the home side.
    case "double_chance":
      return (label) => {
        const parts = label.split(/\s+or\s+|\//i).map((p) => p.trim());
        const hasHome = parts.includes(home);
        const hasAway = parts.includes(away);
        if (hasHome && !hasAway) return 0;
        if (hasHome && hasAway) return 1;
        return 2;
      };

    default:
      return null;
  }
}
