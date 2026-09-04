import type { Event } from "@drizzle/schema";
import { competitionMeta, regionName } from "./competitions";

/**
 * The sportsbook filter used to be one flat rail: every sport, then every
 * competition, in a single row of identical discs. With four sports and
 * twenty-one leagues on offer that is twenty-five circles to scroll past, and
 * "Voetbal" sits next to "Serie B" as if they were the same kind of choice.
 *
 * They are not. Picking a sport narrows the board; picking a league narrows it
 * again. So the rail is two rows now — sports on top, the leagues *inside*
 * that sport underneath — and "binnenkort" stops being a category at all: it
 * is a time filter that combines with either.
 */

export type SportTab = {
  /** URL value for ?s= */
  key: string;
  label: string;
  count: number;
};

export type LeagueChip = {
  /** URL value for ?l= — the provider sport key, unique per league. */
  key: string;
  name: string;
  /** Lowercase ISO country code when we ship a flag for it. */
  country: string | null;
  /** 1 = this country's top division; ranks the country submenu. */
  tier: number;
  count: number;
};

export type SportsbookFilter = {
  sport: string;
  league: string | null;
  soon: boolean;
};

export const ALL_SPORTS = "alles";

const SOON_HOURS = 24;

export function slug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

type Filterable = Pick<Event, "startsAt" | "sportKey" | "sportLabel" | "competition">;

function isSoon(event: Filterable, now: Date): boolean {
  const diff = event.startsAt.getTime() - now.getTime();
  return diff >= 0 && diff <= SOON_HOURS * 3_600_000;
}

/**
 * Reads the query string into a filter that can never point at an empty page:
 * an unknown sport or a league that isn't on offer falls back to everything.
 */
export function resolveFilter(
  events: Filterable[],
  params: { s?: string; l?: string; soon?: string }
): SportsbookFilter {
  const soon = params.soon === "1";

  const league =
    params.l && events.some((e) => e.sportKey === params.l) ? params.l : null;

  // A league implies its sport, so a shared link only ever needs ?l=.
  const impliedSport = league
    ? events.find((e) => e.sportKey === league)?.sportLabel
    : undefined;

  const sport = impliedSport
    ? slug(impliedSport)
    : params.s && events.some((e) => slug(e.sportLabel) === params.s)
      ? params.s
      : ALL_SPORTS;

  return { sport, league, soon };
}

/**
 * Both rows of the rail. Counts always reflect the *other* filters, so the
 * number on a chip is the number of cards you get by tapping it — a league
 * count shrinks when "binnen 24 uur" is on, and never reads as a promise the
 * list can't keep.
 */
export function buildNav(
  events: Filterable[],
  filter: SportsbookFilter,
  now = new Date()
): { sports: SportTab[]; leagues: LeagueChip[]; soonCount: number } {
  const inWindow = filter.soon ? events.filter((e) => isSoon(e, now)) : events;

  const sportCounts = new Map<string, { label: string; count: number }>();
  for (const event of inWindow) {
    const key = slug(event.sportLabel);
    const entry = sportCounts.get(key) ?? { label: event.sportLabel, count: 0 };
    entry.count += 1;
    sportCounts.set(key, entry);
  }

  const sports: SportTab[] = [
    { key: ALL_SPORTS, label: "Alles", count: inWindow.length },
    ...[...sportCounts.entries()]
      .map(([key, { label, count }]) => ({ key, label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "nl")),
  ];

  // Only the leagues inside the chosen sport — that is the whole point of the
  // second row. With "Alles" active it lists them all, biggest first.
  const forLeagues =
    filter.sport === ALL_SPORTS
      ? inWindow
      : inWindow.filter((e) => slug(e.sportLabel) === filter.sport);

  const leagueCounts = new Map<string, LeagueChip & { sportLabel: string }>();
  for (const event of forLeagues) {
    const existing = leagueCounts.get(event.sportKey);
    if (existing) {
      existing.count += 1;
      continue;
    }
    const meta = competitionMeta(event.sportKey, event.competition, event.sportLabel);
    leagueCounts.set(event.sportKey, {
      key: event.sportKey,
      name: meta.name,
      country: meta.country,
      tier: meta.tier,
      sportLabel: event.sportLabel,
      count: 1,
    });
  }

  // A sport that is its own only competition — boxing, MMA — would otherwise
  // appear twice in a row: once as a sport, once as a league with the same
  // name and the same count. The sport tab already filters it.
  const leaguesPerSport = new Map<string, number>();
  for (const league of leagueCounts.values()) {
    leaguesPerSport.set(league.sportLabel, (leaguesPerSport.get(league.sportLabel) ?? 0) + 1);
  }

  const leagues = [...leagueCounts.values()]
    .filter((l) => !(l.name === l.sportLabel && leaguesPerSport.get(l.sportLabel) === 1))
    .map(({ sportLabel: _sportLabel, ...chip }) => chip)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "nl"));

  return { sports, leagues, soonCount: events.filter((e) => isSoon(e, now)).length };
}

export type CountryGroup = {
  /** Flag code, or null for the supranational bucket. */
  code: string | null;
  name: string;
  count: number;
  leagues: LeagueChip[];
  /** One of the big leagues, hoisted to the top of the menu. */
  featured: boolean;
};

/**
 * The countries this league actually bets on, in the order they get picked.
 *
 * Strict alphabetical is fair and useless: it buries Engeland and Spanje
 * behind Brazilië and Denemarken, and these seven are where nearly every slip
 * comes from. They sit at the top; everything else stays alphabetical
 * underneath, which is still the right order for a list you scan by name.
 */
const FEATURED_COUNTRIES = ["gb-eng", "es", "de", "it", "fr", "nl", "pt"];

/**
 * The leagues again, filed by country, for the menu behind "Alle competities".
 *
 * The pill row is fast to scan but it only scales so far: today it is
 * seventeen football leagues, and every competition switched on in the admin
 * makes it longer. A country list stays the same height however many leagues
 * sit underneath it.
 *
 * The seven big leagues first, then alphabetical — a list you scan by name has
 * to be in name order — with the supranational bucket pinned to the end, since
 * "Internationaal" is not a country and sorting it among them reads as a
 * mistake.
 */
export function groupLeaguesByCountry(leagues: LeagueChip[]): CountryGroup[] {
  const groups = new Map<string, CountryGroup>();

  for (const league of leagues) {
    const key = league.country ?? "";
    const group = groups.get(key) ?? {
      code: league.country,
      name: league.country ? regionName(league.country) : "Internationaal",
      count: 0,
      leagues: [],
      featured: league.country !== null && FEATURED_COUNTRIES.includes(league.country),
    };
    group.count += league.count;
    group.leagues.push(league);
    groups.set(key, group);
  }

  // Top division first, whatever the fixture count says. A second tier plays
  // more midweek rounds than the first, so counting alone put Championship
  // above the Premier League and LaLiga 2 above LaLiga.
  for (const group of groups.values()) {
    group.leagues.sort(
      (a, b) => a.tier - b.tier || b.count - a.count || a.name.localeCompare(b.name, "nl")
    );
  }

  const rank = (group: CountryGroup) => {
    if (!group.code) return Number.MAX_SAFE_INTEGER; // Internationaal, always last.
    const index = FEATURED_COUNTRIES.indexOf(group.code);
    return index === -1 ? FEATURED_COUNTRIES.length : index;
  };

  return [...groups.values()].sort(
    (a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, "nl")
  );
}

/** Applies the resolved filter to the fixture list. */
export function filterEvents<T extends Filterable>(
  events: T[],
  filter: SportsbookFilter,
  now = new Date()
): T[] {
  return events.filter((event) => {
    if (filter.soon && !isSoon(event, now)) return false;
    if (filter.league) return event.sportKey === filter.league;
    if (filter.sport !== ALL_SPORTS && slug(event.sportLabel) !== filter.sport) return false;
    return true;
  });
}

/** Query string for a rail link, dropping every default so URLs stay short. */
export function filterHref(filter: Partial<SportsbookFilter>): string {
  const params = new URLSearchParams();
  if (filter.league) params.set("l", filter.league);
  else if (filter.sport && filter.sport !== ALL_SPORTS) params.set("s", filter.sport);
  if (filter.soon) params.set("soon", "1");
  const query = params.toString();
  return query ? `/app/sportsbook?${query}` : "/app/sportsbook";
}
