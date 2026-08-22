// Default sport keys per §5.3. Verify against `GET /v4/sports` (free, no
// credits) once a real ODDS_API_KEY is available — The Odds API
// occasionally renames or retires keys.
export const DEFAULT_SPORT_KEYS: Record<string, string> = {
  eredivisie: "soccer_netherlands_eredivisie",
  premier_league: "soccer_epl",
  la_liga: "soccer_spain_la_liga",
  serie_a: "soccer_italy_serie_a",
  bundesliga: "soccer_germany_bundesliga1",
  champions_league: "soccer_uefa_champs_league",
  europa_league: "soccer_uefa_europa_league",
  nba: "basketball_nba",
  atp: "tennis_atp_singles",
  wta: "tennis_wta_singles",
  mma: "mma_mixed_martial_arts",
};

export const DEFAULT_SPORT_LABELS: Record<string, string> = {
  eredivisie: "Eredivisie",
  premier_league: "Premier League",
  la_liga: "La Liga",
  serie_a: "Serie A",
  bundesliga: "Bundesliga",
  champions_league: "Champions League",
  europa_league: "Europa League",
  nba: "NBA",
  atp: "ATP",
  wta: "WTA",
  mma: "MMA/UFC",
};
