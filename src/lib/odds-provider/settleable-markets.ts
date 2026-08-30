import type { MarketType } from "./types";

/**
 * Which markets a sport's final score can actually decide.
 *
 * Settlement has exactly one number per side to work with — whatever
 * /scores returns for that sport. A market is only safe when its line is
 * quoted in the same unit as that number.
 *
 * Tennis is the reason this exists. It quotes its total in games (39.5) and
 * its handicap in sets (-1.5), so no single score can settle both: one of
 * them would have been paid out against the wrong unit, on every match.
 * Boxing and MMA offer nothing but a winner anyway, and the rest of football's
 * markets are meaningless there.
 *
 * The default is deliberately the narrowest one. Adding a sport should not
 * quietly enable markets nobody has checked the units of.
 */
const BY_SPORT_PREFIX: { prefix: string; markets: MarketType[] }[] = [
  // Goals settle everything: totals, handicaps, both-teams-to-score, the lot.
  {
    prefix: "soccer_",
    markets: [
      "h2h",
      "totals",
      "spreads",
      "team_totals",
      "btts",
      "double_chance",
      "draw_no_bet",
      "correct_score",
    ],
  },
  // Points, and the lines are quoted in points too.
  { prefix: "basketball_", markets: ["h2h", "totals", "spreads"] },
  { prefix: "americanfootball_", markets: ["h2h", "totals", "spreads"] },
  { prefix: "icehockey_", markets: ["h2h", "totals", "spreads"] },
  { prefix: "baseball_", markets: ["h2h", "totals", "spreads"] },
  // Games, sets and one score to settle them with — winner only.
  { prefix: "tennis_", markets: ["h2h"] },
  { prefix: "mma_", markets: ["h2h"] },
  { prefix: "boxing_", markets: ["h2h"] },
];

const FALLBACK: MarketType[] = ["h2h"];

/**
 * Narrows a challenge's configured markets to the ones this sport can settle,
 * keeping the challenge's own order. Never widens: a market the challenge did
 * not ask for is never added back.
 */
export function settleableMarkets(sportKey: string, configured: MarketType[]): MarketType[] {
  const rule = BY_SPORT_PREFIX.find((r) => sportKey.startsWith(r.prefix));
  const allowed = new Set(rule?.markets ?? FALLBACK);
  return configured.filter((m) => allowed.has(m));
}
