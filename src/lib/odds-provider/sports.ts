// Fallback list for when there's no ODDS_API_KEY yet: the admin sportsbook
// settings normally fetch the live catalogue (free call), because keys change.
// Verified against GET /v4/sports?all=true on 2026-08-22.
//
// Tennis is deliberately absent: The Odds API scopes tennis per tournament
// (tennis_atp_wimbledon, tennis_atp_us_open, ...) and those rotate through the
// year, so no static key survives. Pick the current tournament from the live
// list instead.
export const DEFAULT_SPORT_KEYS: Record<string, string> = {
  eredivisie: "soccer_netherlands_eredivisie",
  premier_league: "soccer_epl",
  la_liga: "soccer_spain_la_liga",
  serie_a: "soccer_italy_serie_a",
  bundesliga: "soccer_germany_bundesliga",
  ligue_1: "soccer_france_ligue_one",
  champions_league: "soccer_uefa_champs_league",
  europa_league: "soccer_uefa_europa_league",
  nba: "basketball_nba",
  nfl: "americanfootball_nfl",
  mma: "mma_mixed_martial_arts",
};

export const DEFAULT_SPORT_LABELS: Record<string, string> = {
  eredivisie: "Eredivisie",
  premier_league: "Premier League",
  la_liga: "La Liga",
  serie_a: "Serie A",
  bundesliga: "Bundesliga",
  ligue_1: "Ligue 1",
  champions_league: "Champions League",
  europa_league: "Europa League",
  nba: "NBA",
  nfl: "NFL",
  mma: "MMA/UFC",
};

/** Groups we surface first in the admin picker; everything else follows. */
export const SPORT_GROUP_ORDER = [
  "Soccer",
  "Basketball",
  "Tennis",
  "American Football",
  "Mixed Martial Arts",
  "Ice Hockey",
  "Baseball",
];

export const SPORT_GROUP_LABELS: Record<string, string> = {
  Soccer: "Voetbal",
  Basketball: "Basketbal",
  Tennis: "Tennis",
  "American Football": "American football",
  "Mixed Martial Arts": "MMA",
  "Ice Hockey": "IJshockey",
  Baseball: "Honkbal",
  Boxing: "Boksen",
  Golf: "Golf",
  Cricket: "Cricket",
  "Rugby League": "Rugby",
  "Aussie Rules": "Aussie rules",
  Politics: "Politiek",
  Handmatig: "Handmatig",
};
