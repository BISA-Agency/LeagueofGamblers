/**
 * Which market an event card leads with.
 *
 * The card has room for one row of prices, and it should be the row people
 * came for: the match result. Everything else lives behind "+n markten".
 *
 * The order is explicit rather than derived, and anything unlisted sorts to
 * the back. That last part is the whole point — the previous version ranked
 * with indexOf, which hands an unknown type -1, and -1 sorts ahead of h2h at
 * 0. It went unnoticed while fixtures only carried the three original
 * markets; the moment every fixture also had both-teams-to-score, cards
 * started leading with "Yes / No" instead of 1 X 2.
 */
const PRIORITY = [
  "h2h",
  "double_chance",
  "draw_no_bet",
  "totals",
  "spreads",
  "btts",
  "team_totals",
  "correct_score",
  "custom",
];

function rank(type: string): number {
  const index = PRIORITY.indexOf(type);
  return index === -1 ? PRIORITY.length : index;
}

export function pickPrimaryMarket<T extends { type: string }>(markets: T[]): T | undefined {
  if (markets.length === 0) return undefined;
  return [...markets].sort((a, b) => rank(a.type) - rank(b.type))[0];
}
