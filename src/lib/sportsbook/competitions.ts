import { isKnownCountry } from "@/lib/countries";

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
export type CompetitionMeta = {
  /** Short name, no country tacked on: "LaLiga", "2. Bundesliga". */
  name: string;
  /** Lowercase ISO 3166-1 alpha-2, or null for anything supranational. */
  country: string | null;
};

/** The leagues we actually offer, plus the obvious neighbours. */
const LEAGUES: Record<string, { name: string; country?: string }> = {
  // England — no gb-eng flag in the set we ship, so the Union Jack stands in.
  soccer_epl: { name: "Premier League", country: "gb" },
  soccer_efl_champ: { name: "Championship", country: "gb" },
  soccer_england_league1: { name: "League One", country: "gb" },
  soccer_england_league2: { name: "League Two", country: "gb" },
  soccer_england_efl_cup: { name: "EFL Cup", country: "gb" },
  soccer_fa_cup: { name: "FA Cup", country: "gb" },
  soccer_spl: { name: "Premiership", country: "gb" },

  soccer_netherlands_eredivisie: { name: "Eredivisie", country: "nl" },
  soccer_belgium_first_div: { name: "Pro League", country: "be" },

  soccer_spain_la_liga: { name: "LaLiga", country: "es" },
  soccer_spain_segunda_division: { name: "LaLiga 2", country: "es" },

  soccer_italy_serie_a: { name: "Serie A", country: "it" },
  soccer_italy_serie_b: { name: "Serie B", country: "it" },
  soccer_italy_coppa_italia: { name: "Coppa Italia", country: "it" },

  soccer_germany_bundesliga: { name: "Bundesliga", country: "de" },
  soccer_germany_bundesliga2: { name: "2. Bundesliga", country: "de" },
  soccer_germany_liga3: { name: "3. Liga", country: "de" },

  soccer_france_ligue_one: { name: "Ligue 1", country: "fr" },
  soccer_france_ligue_two: { name: "Ligue 2", country: "fr" },

  soccer_portugal_primeira_liga: { name: "Primeira Liga", country: "pt" },
  soccer_turkey_super_league: { name: "Süper Lig", country: "tr" },
  soccer_greece_super_league: { name: "Super League", country: "gr" },
  soccer_austria_bundesliga: { name: "Bundesliga", country: "at" },
  soccer_switzerland_superleague: { name: "Super League", country: "ch" },
  soccer_denmark_superliga: { name: "Superliga", country: "dk" },
  soccer_sweden_allsvenskan: { name: "Allsvenskan", country: "se" },
  soccer_sweden_superettan: { name: "Superettan", country: "se" },
  soccer_norway_eliteserien: { name: "Eliteserien", country: "no" },
  soccer_finland_veikkausliiga: { name: "Veikkausliiga", country: "fi" },
  soccer_poland_ekstraklasa: { name: "Ekstraklasa", country: "pl" },
  soccer_league_of_ireland: { name: "Premier Division", country: "ie" },

  soccer_usa_mls: { name: "MLS", country: "us" },
  soccer_mexico_ligamx: { name: "Liga MX", country: "mx" },
  soccer_brazil_campeonato: { name: "Brasileirão", country: "br" },
  soccer_brazil_serie_b: { name: "Série B", country: "br" },
  soccer_argentina_primera_division: { name: "Primera División", country: "ar" },
  soccer_japan_j_league: { name: "J1 League", country: "jp" },
  soccer_korea_kleague1: { name: "K League 1", country: "kr" },
  soccer_china_superleague: { name: "Super League", country: "cn" },
  soccer_australia_aleague: { name: "A-League", country: "au" },

  // Supranational: no flag, and none is wanted — a UEFA night is not Spain.
  soccer_uefa_champs_league: { name: "Champions League" },
  soccer_uefa_champs_league_qualification: { name: "CL-kwalificatie" },
  soccer_uefa_europa_league: { name: "Europa League" },
  soccer_uefa_europa_conference_league: { name: "Conference League" },
  soccer_uefa_nations_league: { name: "Nations League" },
  soccer_uefa_european_championship: { name: "EK" },
  soccer_fifa_world_cup: { name: "WK" },
  soccer_fifa_world_cup_qualifiers_europe: { name: "WK-kwalificatie" },
  soccer_conmebol_copa_libertadores: { name: "Copa Libertadores" },

  basketball_nba: { name: "NBA", country: "us" },
  basketball_wnba: { name: "WNBA", country: "us" },
  basketball_ncaab: { name: "NCAA", country: "us" },
  basketball_euroleague: { name: "EuroLeague" },
  americanfootball_nfl: { name: "NFL", country: "us" },
  americanfootball_ncaaf: { name: "NCAA Football", country: "us" },
  icehockey_nhl: { name: "NHL", country: "us" },
  baseball_mlb: { name: "MLB", country: "us" },

  mma_mixed_martial_arts: { name: "MMA" },
  boxing_boxing: { name: "Boksen" },
};

/**
 * Second-level guess for a league we have no entry for: the provider puts the
 * country in the key itself (`soccer_spain_la_liga`), so a league switched on
 * in the admin next month still gets its flag without a code change.
 */
const COUNTRY_BY_SEGMENT: Record<string, string> = {
  netherlands: "nl", holland: "nl", belgium: "be", germany: "de", france: "fr",
  spain: "es", italy: "it", portugal: "pt", england: "gb", scotland: "gb",
  wales: "gb", austria: "at", switzerland: "ch", denmark: "dk", sweden: "se",
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
  italian: "it", portuguese: "pt", english: "gb", scottish: "gb",
  austrian: "at", swiss: "ch", danish: "dk", swedish: "se", norwegian: "no",
  finnish: "fi", irish: "ie", polish: "pl", greek: "gr", turkish: "tr",
  brazilian: "br", argentine: "ar", japanese: "jp", mexican: "mx",
  australian: "au", american: "us",
};

function shippedFlag(code: string | null | undefined): string | null {
  if (!code) return null;
  return isKnownCountry(code) ? code.toLowerCase() : null;
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
  if (known) return { name: known.name, country: shippedFlag(known.country) };

  const fallback = tidyTitle(title ?? sportLabel);
  const fromKey = sportKey?.split("_").map((s) => COUNTRY_BY_SEGMENT[s]).find(Boolean) ?? null;

  return {
    name: fallback.name || sportLabel,
    country: shippedFlag(fallback.country ?? fromKey),
  };
}

/** Path under public/ for a flag we ship, or null. */
export function flagPath(country: string | null): string | null {
  return country ? `/flags/${country}.svg` : null;
}
