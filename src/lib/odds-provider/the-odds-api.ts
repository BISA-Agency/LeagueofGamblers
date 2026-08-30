// NEVER import this module from a "use client" component — it embeds
// ODDS_API_KEY in every request URL. Only call it from server actions,
// route handlers, or cron jobs.
import type {
  MarketType,
  OddsAggregationStrategy,
  OddsProvider,
  ProviderEvent,
  ProviderEventOdds,
  ProviderMarket,
  ProviderResult,
  ProviderSport,
  UsageInfo,
} from "./types";
import { sportLabelFromKey } from "./sports";
import { normalizeCorrectScoreLabel } from "./correct-score";

const BASE_URL = "https://api.the-odds-api.com/v4";

const MARKET_LABELS: Record<MarketType, string> = {
  h2h: "Uitslag (1X2)",
  totals: "Over/Under",
  spreads: "Handicap",
  team_totals: "Team totaal",
  btts: "Beide teams scoren",
  double_chance: "Dubbele kans",
  draw_no_bet: "Draw no bet",
  correct_score: "Correcte score",
};

/**
 * Which API keys we ask for per market type, and how the keys in the response
 * map back. The alternate_* variants are the same bet at a different line, so
 * they fold into the same type — a 2.5 and a 3.5 over/under are two markets of
 * type "totals", not two kinds of market.
 */
const API_KEYS: Record<MarketType, string[]> = {
  h2h: ["h2h"],
  totals: ["totals", "alternate_totals"],
  spreads: ["spreads", "alternate_spreads"],
  team_totals: ["team_totals", "alternate_team_totals"],
  btts: ["btts"],
  double_chance: ["double_chance"],
  draw_no_bet: ["draw_no_bet"],
  correct_score: ["correct_score"],
};

const TYPE_BY_API_KEY = new Map<string, MarketType>(
  Object.entries(API_KEYS).flatMap(([type, keys]) =>
    keys.map((key) => [key, type as MarketType] as const)
  )
);

type RawEvent = {
  id: string;
  sport_key: string;
  sport_title?: string;
  commence_time: string;
  home_team?: string;
  away_team?: string;
};

// description carries the subject of a market that needs one — the team on a
// team total, the player on a prop.
type RawOutcome = { name: string; price: number; point?: number; description?: string };
type RawMarket = { key: string; outcomes: RawOutcome[] };
type RawBookmaker = { key: string; title: string; markets: RawMarket[] };
type RawEventWithOdds = RawEvent & { bookmakers: RawBookmaker[] };
type RawScoreEvent = {
  id: string;
  completed: boolean;
  scores?: { name: string; score: string }[] | null;
};

function toProviderEvent(e: RawEvent): ProviderEvent {
  const title = e.sport_title ?? e.sport_key;
  return {
    externalId: e.id,
    sportKey: e.sport_key,
    // The API's sport_title is the competition ("La Liga - Spain"); the sport
    // itself lives only in the key. Getting these the right way round is what
    // makes the icons and the category rail work on imported events — the seed
    // data had them correct, so this only ever showed up against the real API.
    sportLabel: sportLabelFromKey(e.sport_key, title),
    competition: title,
    homeTeam: e.home_team,
    awayTeam: e.away_team,
    name: e.home_team && e.away_team ? `${e.home_team} - ${e.away_team}` : e.id,
    startsAt: new Date(e.commence_time),
  };
}

function getStrategyFromEnv(): OddsAggregationStrategy {
  const raw = process.env.ODDS_AGGREGATION_STRATEGY;
  if (raw === "average") return { mode: "average" };
  if (raw?.startsWith("reference:")) {
    return { mode: "reference", bookmakerKey: raw.slice("reference:".length) };
  }
  return { mode: "highest" };
}

function pickOdds(quotes: { odds: number; bookmakerKey: string }[], strategy: OddsAggregationStrategy) {
  if (strategy.mode === "average") {
    return quotes.reduce((sum, q) => sum + q.odds, 0) / quotes.length;
  }
  if (strategy.mode === "reference") {
    const match = quotes.find((q) => q.bookmakerKey === strategy.bookmakerKey);
    if (match) return match.odds;
    // Reference bookmaker didn't quote this outcome — fall back to highest.
  }
  return Math.max(...quotes.map((q) => q.odds));
}

/**
 * One bucket per market that a player can actually bet as a unit.
 *
 * Bucketing on the API key alone was wrong even before alternate lines: two
 * bookmakers offering Over/Under at 2.5 and at 3.5 landed in the same bucket
 * and their prices were averaged across different lines. The key has to
 * include the line and the subject.
 *
 * abs() on the point, because a handicap's two sides carry opposite signs
 * (home -1.5, away +1.5) and belong to the same market, while -1.5 and -2.5
 * are genuinely different markets.
 */
function bucketKey(apiKey: string, outcome: RawOutcome): string {
  const point = outcome.point === undefined ? "" : Math.abs(outcome.point).toString();
  return `${apiKey}|${outcome.description ?? ""}|${point}`;
}

function aggregateMarkets(
  raw: RawEventWithOdds,
  marketTypes: MarketType[],
  strategy: OddsAggregationStrategy
): ProviderMarket[] {
  type Bucket = {
    type: MarketType;
    line?: number;
    team?: string;
    outcomeQuotes: Map<string, { odds: number; bookmakerKey: string }[]>;
  };
  const buckets = new Map<string, Bucket>();

  for (const bookmaker of raw.bookmakers ?? []) {
    for (const market of bookmaker.markets ?? []) {
      const type = TYPE_BY_API_KEY.get(market.key);
      if (!type || !marketTypes.includes(type)) continue;

      for (const outcome of market.outcomes) {
        // "Leeds United:1|Brentford:0" becomes "1-0" before anything else sees
        // it, so the bet slip and the settlement agree on one format. An
        // unreadable label is dropped rather than stored — a correct-score
        // outcome nobody can settle is worse than one that isn't offered.
        let label = outcome.name;
        if (type === "correct_score") {
          const normalized = normalizeCorrectScoreLabel(
            outcome.name,
            raw.home_team,
            raw.away_team
          );
          if (!normalized) continue;
          label = normalized;
        }

        const key = bucketKey(market.key, outcome);
        const bucket: Bucket =
          buckets.get(key) ?? { type, team: outcome.description, outcomeQuotes: new Map() };

        const list = bucket.outcomeQuotes.get(label) ?? [];
        list.push({ odds: outcome.price, bookmakerKey: bookmaker.key });
        bucket.outcomeQuotes.set(label, list);

        if (outcome.point !== undefined) {
          // Settlement reads a handicap as the HOME team's line, so take the
          // sign from the home outcome. Taking whichever came last flipped the
          // sign whenever the away side was listed second, which is the usual
          // order — every spread settled against the wrong line.
          if (type === "spreads") {
            if (outcome.name === raw.home_team) bucket.line = outcome.point;
            else if (bucket.line === undefined) bucket.line = -outcome.point;
          } else {
            bucket.line = outcome.point;
          }
        }

        buckets.set(key, bucket);
      }
    }
  }

  return Array.from(buckets.values()).map((bucket) => ({
    type: bucket.type,
    label: marketLabel(bucket.type, bucket.line, bucket.team, raw.home_team),
    line: bucket.line,
    team: bucket.team,
    outcomes: Array.from(bucket.outcomeQuotes.entries()).map(([label, quotes]) => ({
      label,
      odds: pickOdds(quotes, strategy),
    })),
  }));
}

/** With alternate lines in play the label has to name the line, or a card shows five identical "Over/Under" rows. */
function marketLabel(type: MarketType, line?: number, team?: string, homeTeam?: string): string {
  const base = MARKET_LABELS[type] ?? type;
  if (type === "team_totals" && team) {
    return line === undefined ? `${team} totaal` : `${team} over/under ${line}`;
  }
  if (line === undefined) return base;
  if (type === "spreads") {
    // A handicap is always quoted from the home team's side, so the label says
    // whose it is — "Handicap +1" on a bet slip is otherwise unreadable.
    const signed = `${line > 0 ? "+" : ""}${line}`;
    return homeTeam ? `${base} ${homeTeam} ${signed}` : `${base} ${signed}`;
  }
  return `${base} ${line}`;
}

function parseIntHeader(value: string | null): number | null {
  if (value === null) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export class TheOddsApiProvider implements OddsProvider {
  constructor(
    private readonly apiKey: string,
    private readonly regions = "eu"
  ) {}

  async listSports(): Promise<ProviderSport[]> {
    // all=true also returns out-of-season competitions, which the admin still
    // needs to be able to pick — a challenge starting in September wants the
    // Champions League selected in August, while it's still inactive.
    const url = new URL(`${BASE_URL}/sports`);
    url.searchParams.set("apiKey", this.apiKey);
    url.searchParams.set("all", "true");

    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) {
      throw new Error(`The Odds API listSports failed: ${res.status} ${await res.text()}`);
    }
    const raw: { key: string; title: string; group: string; active: boolean }[] = await res.json();
    return raw.map((s) => ({ key: s.key, title: s.title, group: s.group, active: s.active }));
  }

  async listEvents(sportKey: string, from: Date, to: Date): Promise<ProviderEvent[]> {
    const url = new URL(`${BASE_URL}/sports/${sportKey}/events`);
    url.searchParams.set("apiKey", this.apiKey);
    url.searchParams.set("commenceTimeFrom", toApiDate(from));
    url.searchParams.set("commenceTimeTo", toApiDate(to));

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`The Odds API listEvents failed: ${res.status} ${await res.text()}`);
    }
    const raw = (await res.json()) as RawEvent[];
    return raw.map(toProviderEvent);
  }

  async getOdds(
    sportKey: string,
    markets: MarketType[]
  ): Promise<{ events: ProviderEventOdds[] } & UsageInfo> {
    const url = new URL(`${BASE_URL}/sports/${sportKey}/odds`);
    url.searchParams.set("apiKey", this.apiKey);
    url.searchParams.set("regions", this.regions);
    url.searchParams.set("markets", markets.join(","));
    url.searchParams.set("oddsFormat", "decimal");
    url.searchParams.set("dateFormat", "iso");

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`The Odds API getOdds failed: ${res.status} ${await res.text()}`);
    }
    const raw = (await res.json()) as RawEventWithOdds[];
    const strategy = getStrategyFromEnv();

    const events = raw.map((e) => ({
      event: toProviderEvent(e),
      markets: aggregateMarkets(e, markets, strategy),
    }));

    return {
      events,
      // x-requests-last is what THIS call cost. x-requests-used is the
      // account's lifetime total, so summing that across sports produced a
      // meaningless number on the admin dashboard.
      creditsUsed: parseIntHeader(res.headers.get("x-requests-last")),
      creditsRemaining: parseIntHeader(res.headers.get("x-requests-remaining")),
    };
  }

  /**
   * Additional markets, one event at a time — The Odds API does not serve them
   * in bulk. Billed on the markets actually RETURNED, so asking for four and
   * getting two back costs two.
   */
  async getEventOdds(
    sportKey: string,
    eventExternalId: string,
    marketTypes: MarketType[]
  ): Promise<{ markets: ProviderMarket[] } & UsageInfo> {
    const apiKeys = marketTypes.flatMap((type) => API_KEYS[type] ?? []);
    if (apiKeys.length === 0) {
      return { markets: [], creditsUsed: 0, creditsRemaining: null };
    }

    const url = new URL(`${BASE_URL}/sports/${sportKey}/events/${eventExternalId}/odds`);
    url.searchParams.set("apiKey", this.apiKey);
    url.searchParams.set("regions", this.regions);
    url.searchParams.set("markets", apiKeys.join(","));
    url.searchParams.set("oddsFormat", "decimal");
    url.searchParams.set("dateFormat", "iso");

    const res = await fetch(url, { cache: "no-store" });
    // A 404 means this bookmaker set has nothing extra for the fixture, which
    // is normal and must not abort the whole import.
    if (res.status === 404) return { markets: [], creditsUsed: 0, creditsRemaining: null };
    if (!res.ok) {
      throw new Error(`The Odds API getEventOdds failed: ${res.status} ${await res.text()}`);
    }

    const raw = (await res.json()) as RawEventWithOdds;
    return {
      markets: aggregateMarkets(raw, marketTypes, getStrategyFromEnv()),
      creditsUsed: parseIntHeader(res.headers.get("x-requests-last")),
      creditsRemaining: parseIntHeader(res.headers.get("x-requests-remaining")),
    };
  }

  async getResults(sportKey: string, eventExternalIds: string[]): Promise<ProviderResult[]> {
    const url = new URL(`${BASE_URL}/sports/${sportKey}/scores`);
    url.searchParams.set("apiKey", this.apiKey);
    url.searchParams.set("daysFrom", "3");
    url.searchParams.set("dateFormat", "iso");

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`The Odds API getResults failed: ${res.status} ${await res.text()}`);
    }
    const raw = (await res.json()) as RawScoreEvent[];
    const wanted = new Set(eventExternalIds);

    return raw
      .filter((e) => wanted.has(e.id))
      .map((e) => ({
        externalId: e.id,
        completed: e.completed,
        scores: e.scores?.map((s) => ({ name: s.name, score: Number(s.score) })),
      }));
  }
}

function toApiDate(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}
