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
  /**
   * Competitions the reader asked to see in full.
   *
   * It lives in the URL rather than in component state on purpose: expanding a
   * group has to fetch the extra fixtures, not reveal ones that were already
   * sent. Rendering all 162 and hiding 156 would leave the page exactly as
   * heavy as it is now, which is the thing being fixed.
   */
  open: string[];
};

/** Fixtures shown per competition before the expand link appears. */
export const VISIBLE_PER_GROUP = 6;

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
  params: { s?: string; l?: string; soon?: string; open?: string },
  // Passed in like every other function here, rather than read off the clock:
  // a function that decides what you see should be testable at a fixed moment.
  now = new Date()
): SportsbookFilter {
  const open = (params.open ?? "").split(",").filter(Boolean);

  /**
   * The board opens on the next 24 hours, not on everything.
   *
   * Every bookmaker does this and for the same reason: a list of every fixture
   * you price is not a page anyone reads, it is a page they scroll past. Here
   * it was 162 cards and 1.2 MB to find the three matches on tonight.
   *
   * ?soon=0 turns it off and shows the lot — so the toggle now switches a
   * default off rather than a filter on, and a shared link still says exactly
   * what it shows.
   */
  const wantsSoon = params.soon !== "0";
  // Never onto an empty page: a quiet Monday with nothing in the window falls
  // back to the full list rather than an empty one with no obvious way out.
  const soon = wantsSoon && events.some((e) => isSoon(e, now));

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

  return { sport, league, soon, open };
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
): { sports: SportTab[]; leagues: LeagueChip[] } {
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

  /**
   * League chips count the whole competition, not just the part inside the
   * window — because tapping one shows the whole competition. A chip has to
   * promise exactly what it delivers, and the sport chips above it count
   * within the window for the same reason.
   */
  const forLeagues =
    filter.sport === ALL_SPORTS
      ? events
      : events.filter((e) => slug(e.sportLabel) === filter.sport);

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

  return { sports, leagues };
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
    /**
     * A chosen competition shows all of itself, window or no window.
     *
     * The board opens on the next 24 hours, so without this there would be no
     * way left to see Wednesday's Champions League at all. Picking a
     * competition is the way you say "show me this one properly" — which is
     * how every bookmaker's league page works.
     */
    if (filter.league) return event.sportKey === filter.league;
    if (filter.soon && !isSoon(event, now)) return false;
    if (filter.sport !== ALL_SPORTS && slug(event.sportLabel) !== filter.sport) return false;
    return true;
  });
}

/** Query string for a rail link, dropping every default so URLs stay short. */
export function filterHref(filter: Partial<SportsbookFilter>): string {
  const params = new URLSearchParams();
  if (filter.league) params.set("l", filter.league);
  else if (filter.sport && filter.sport !== ALL_SPORTS) params.set("s", filter.sport);
  if (filter.soon === false) params.set("soon", "0");
  // Only the expand links carry this. Changing sport or league starts over
  // with every competition collapsed, which is what picking a filter means.
  if (filter.open && filter.open.length > 0) params.set("open", filter.open.join(","));
  const query = params.toString();
  return query ? `/app/sportsbook?${query}` : "/app/sportsbook";
}

export type FixtureGroup<T> = {
  /** The provider sport key — one league, one group. */
  sportKey: string;
  sportLabel: string;
  competition: string | null;
  /** What actually gets rendered. */
  shown: T[];
  /** How many more this competition has behind the expand link. */
  hidden: number;
};

/**
 * The board as it will be drawn: grouped by competition, ordered by the
 * earliest kick-off, capped per group unless the reader asked for more.
 *
 * It lives here rather than inside the list component so the page can know
 * which fixtures it is about to render *before* it renders them — and so
 * fetch odds for exactly those, instead of for all of them and throwing most
 * of it away.
 */
export function groupFixtures<
  T extends { sportKey: string; sportLabel: string; competition: string | null; startsAt: Date },
>(events: T[], filter: SportsbookFilter): FixtureGroup<T>[] {
  const groups = new Map<string, T[]>();
  for (const event of events) {
    groups.set(event.sportKey, [...(groups.get(event.sportKey) ?? []), event]);
  }

  const earliest = (list: T[]) => Math.min(...list.map((e) => e.startsAt.getTime()));

  return [...groups.entries()]
    .sort(([, a], [, b]) => earliest(a) - earliest(b))
    .map(([sportKey, list]) => {
      // Picking a competition is already asking to see it, so no cap and no
      // link to press twice for the same thing.
      const expanded = filter.league === sportKey || filter.open.includes(sportKey);
      const shown = expanded ? list : list.slice(0, VISIBLE_PER_GROUP);
      return {
        sportKey,
        sportLabel: list[0].sportLabel,
        competition: list[0].competition,
        shown,
        hidden: list.length - shown.length,
      };
    });
}
