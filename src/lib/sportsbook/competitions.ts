import { countryName, isKnownCountry } from "@/lib/countries";

/**
 * Flags the profile picker has no use for but a sportsbook does: football is
 * organised by home nation, so the Premier League belongs under Engeland with
 * the cross of St George, not under "Verenigd Koninkrijk" with a Union Jack.
 *
 * scripts/copy-flags.ts reads this to know which extra SVGs to copy into
 * public/flags/, so the list and the files cannot drift apart.
 */
export const SUBDIVISION_FLAGS: Record<string, string> = {
  "gb-eng": "Engeland",
  "gb-sct": "Schotland",
  "gb-wls": "Wales",
};

/**
 * The provider names its competitions inconsistently — "EPL", "Dutch
 * Eredivisie", "La Liga - Spain", "Bundesliga 2 - Germany", "Turkey Super
 * League". Side by side in a filter rail that reads as a list of typos, and
 * the country is buried in the middle of the string instead of being the one
 * thing you scan for.
 *
 * So we translate: the sport key (stable, one per league) becomes a short name
 * plus a flag. The provider's own title stays the fallback, because a league
 * added next month must still show up rather than disappear.
 */
/** Where an unranked competition goes: behind everything we do rank. */
const UNRANKED_TIER = 99;

export type CompetitionMeta = {
  /** Short name, no country tacked on: "LaLiga", "2. Bundesliga". */
  name: string;
  /** 1 = the country's top division. Ranks the country submenu. */
  tier: number;
  /** Lowercase flag code — ISO 3166-1 alpha-2, or a home nation like
   * "gb-eng" — and null for anything supranational. */
  country: string | null;
};

/**
 * The leagues we actually offer, plus the obvious neighbours.
 *
 * `tier` is the pecking order inside a country: 1 is the top division, 2 the
 * one below it, and the cups sit behind the divisions. Without it a country
 * menu sorts on fixture count, and Championship lands above the Premier League
 * purely because it plays more midweek rounds — which reads as a bug.
 */
const LEAGUES: Record<string, { name: string; country?: string; tier: number }> = {
  soccer_epl: { name: "Premier League", country: "gb-eng", tier: 1 },
  soccer_efl_champ: { name: "Championship", country: "gb-eng", tier: 2 },
  soccer_england_league1: { name: "League One", country: "gb-eng", tier: 3 },
  soccer_england_league2: { name: "League Two", country: "gb-eng", tier: 4 },
  soccer_england_efl_cup: { name: "EFL Cup", country: "gb-eng", tier: 6 },
  soccer_fa_cup: { name: "FA Cup", country: "gb-eng", tier: 5 },
  soccer_spl: { name: "Premiership", country: "gb-sct", tier: 1 },

  soccer_netherlands_eredivisie: { name: "Eredivisie", country: "nl", tier: 1 },
  soccer_belgium_first_div: { name: "Pro League", country: "be", tier: 1 },

  soccer_spain_la_liga: { name: "LaLiga", country: "es", tier: 1 },
  soccer_spain_segunda_division: { name: "LaLiga 2", country: "es", tier: 2 },

  soccer_italy_serie_a: { name: "Serie A", country: "it", tier: 1 },
  soccer_italy_serie_b: { name: "Serie B", country: "it", tier: 2 },
  soccer_italy_coppa_italia: { name: "Coppa Italia", country: "it", tier: 5 },

  soccer_germany_bundesliga: { name: "Bundesliga", country: "de", tier: 1 },
  soccer_germany_bundesliga2: { name: "2. Bundesliga", country: "de", tier: 2 },
  soccer_germany_liga3: { name: "3. Liga", country: "de", tier: 3 },

  soccer_france_ligue_one: { name: "Ligue 1", country: "fr", tier: 1 },
  soccer_france_ligue_two: { name: "Ligue 2", country: "fr", tier: 2 },

  soccer_portugal_primeira_liga: { name: "Primeira Liga", country: "pt", tier: 1 },
  soccer_turkey_super_league: { name: "Süper Lig", country: "tr", tier: 1 },
  soccer_greece_super_league: { name: "Super League", country: "gr", tier: 1 },
  soccer_austria_bundesliga: { name: "Bundesliga", country: "at", tier: 1 },
  soccer_switzerland_superleague: { name: "Super League", country: "ch", tier: 1 },
  soccer_denmark_superliga: { name: "Superliga", country: "dk", tier: 1 },
  soccer_sweden_allsvenskan: { name: "Allsvenskan", country: "se", tier: 1 },
  soccer_sweden_superettan: { name: "Superettan", country: "se", tier: 2 },
  soccer_norway_eliteserien: { name: "Eliteserien", country: "no", tier: 1 },
  soccer_finland_veikkausliiga: { name: "Veikkausliiga", country: "fi", tier: 1 },
  soccer_poland_ekstraklasa: { name: "Ekstraklasa", country: "pl", tier: 1 },
  soccer_league_of_ireland: { name: "Premier Division", country: "ie", tier: 1 },

  soccer_usa_mls: { name: "MLS", country: "us", tier: 1 },
  soccer_mexico_ligamx: { name: "Liga MX", country: "mx", tier: 1 },
  soccer_brazil_campeonato: { name: "Brasileirão", country: "br", tier: 1 },
  soccer_brazil_serie_b: { name: "Série B", country: "br", tier: 2 },
  soccer_argentina_primera_division: { name: "Primera División", country: "ar", tier: 1 },
  soccer_japan_j_league: { name: "J1 League", country: "jp", tier: 1 },
  soccer_korea_kleague1: { name: "K League 1", country: "kr", tier: 1 },
  soccer_china_superleague: { name: "Super League", country: "cn", tier: 1 },
  soccer_australia_aleague: { name: "A-League", country: "au", tier: 1 },

  // Supranational: no flag, and none is wanted — a UEFA night is not Spain.
  soccer_uefa_champs_league: { name: "Champions League", tier: 1 },
  soccer_uefa_champs_league_qualification: { name: "CL-kwalificatie", tier: 4 },
  soccer_uefa_europa_league: { name: "Europa League", tier: 2 },
  soccer_uefa_europa_conference_league: { name: "Conference League", tier: 3 },
  soccer_uefa_nations_league: { name: "Nations League", tier: 5 },
  soccer_uefa_european_championship: { name: "EK", tier: 6 },
  soccer_fifa_world_cup: { name: "WK", tier: 6 },
  soccer_fifa_world_cup_qualifiers_europe: { name: "WK-kwalificatie", tier: 7 },
  soccer_conmebol_copa_libertadores: { name: "Copa Libertadores", tier: 8 },

  basketball_nba: { name: "NBA", country: "us", tier: 1 },
  basketball_wnba: { name: "WNBA", country: "us", tier: 2 },
  basketball_ncaab: { name: "NCAA", country: "us", tier: 3 },
  basketball_euroleague: { name: "EuroLeague", tier: 1 },
  americanfootball_nfl: { name: "NFL", country: "us", tier: 1 },
  americanfootball_ncaaf: { name: "NCAA Football", country: "us", tier: 2 },
  icehockey_nhl: { name: "NHL", country: "us", tier: 1 },
  baseball_mlb: { name: "MLB", country: "us", tier: 1 },

  mma_mixed_martial_arts: { name: "MMA", tier: 1 },
  boxing_boxing: { name: "Boksen", tier: 1 },
};

/**
 * Second-level guess for a league we have no entry for: the provider puts the
 * country in the key itself (`soccer_spain_la_liga`), so a league switched on
 * in the admin next month still gets its flag without a code change.
 */
const COUNTRY_BY_SEGMENT: Record<string, string> = {
  netherlands: "nl", holland: "nl", belgium: "be", germany: "de", france: "fr",
  spain: "es", italy: "it", portugal: "pt", england: "gb-eng", scotland: "gb-sct",
  wales: "gb-wls", austria: "at", switzerland: "ch", denmark: "dk", sweden: "se",
  norway: "no", finland: "fi", ireland: "ie", poland: "pl", czech: "cz",
  hungary: "hu", romania: "ro", bulgaria: "bg", greece: "gr", croatia: "hr",
  serbia: "rs", bosnia: "ba", montenegro: "me", macedonia: "mk", albania: "al",
  slovenia: "si", slovakia: "sk", ukraine: "ua", turkey: "tr", morocco: "ma",
  algeria: "dz", tunisia: "tn", egypt: "eg", usa: "us", canada: "ca",
  mexico: "mx", brazil: "br", argentina: "ar", japan: "jp", korea: "kr",
  china: "cn", india: "in", indonesia: "id", australia: "au",
};

/** Adjectives the provider glues onto a league name ("Dutch Eredivisie"). */
const DEMONYMS: Record<string, string> = {
  dutch: "nl", belgian: "be", german: "de", french: "fr", spanish: "es",
  italian: "it", portuguese: "pt", english: "gb-eng", scottish: "gb-sct",
  austrian: "at", swiss: "ch", danish: "dk", swedish: "se", norwegian: "no",
  finnish: "fi", irish: "ie", polish: "pl", greek: "gr", turkish: "tr",
  brazilian: "br", argentine: "ar", japanese: "jp", mexican: "mx",
  australian: "au", american: "us",
};

function shippedFlag(code: string | null | undefined): string | null {
  if (!code) return null;
  const lower = code.toLowerCase();
  if (lower in SUBDIVISION_FLAGS) return lower;
  return isKnownCountry(code) ? lower : null;
}

/** Dutch name for a flag code, home nations included. */
export function regionName(code: string): string {
  return SUBDIVISION_FLAGS[code.toLowerCase()] ?? countryName(code);
}

/**
 * Trims the country back out of a provider title, so the fallback path still
 * produces something short enough for a pill: "La Liga - Spain" -> "La Liga",
 * "Dutch Eredivisie" -> "Eredivisie", "Turkey Super League" -> "Super League".
 */
function tidyTitle(title: string): { name: string; country: string | null } {
  let name = title.trim();
  let country: string | null = null;

  const suffix = name.match(/^(.*\S)\s+-\s+([\p{L} .]+)$/u);
  if (suffix) {
    const code = COUNTRY_BY_SEGMENT[suffix[2].trim().toLowerCase().replace(/\s+/g, "")];
    if (code) {
      name = suffix[1];
      country = code;
    }
  }

  const [first, ...rest] = name.split(/\s+/);
  if (rest.length > 0) {
    const lead = first.toLowerCase();
    const code = DEMONYMS[lead] ?? COUNTRY_BY_SEGMENT[lead];
    if (code) {
      name = rest.join(" ");
      country ??= code;
    }
  }

  return { name, country };
}

/** Short name + flag for one competition. `title` is the provider's own text. */
export function competitionMeta(
  sportKey: string | null,
  title: string | null,
  sportLabel: string
): CompetitionMeta {
  const known = sportKey ? LEAGUES[sportKey] : undefined;
  if (known) return { name: known.name, country: shippedFlag(known.country), tier: known.tier };

  const fallback = tidyTitle(title ?? sportLabel);
  const fromKey = sportKey?.split("_").map((s) => COUNTRY_BY_SEGMENT[s]).find(Boolean) ?? null;

  return {
    name: fallback.name || sportLabel,
    country: shippedFlag(fallback.country ?? fromKey),
    tier: UNRANKED_TIER,
  };
}

/** Path under public/ for a flag we ship, or null. */
export function flagPath(country: string | null): string | null {
  return country ? `/flags/${country}.svg` : null;
}
