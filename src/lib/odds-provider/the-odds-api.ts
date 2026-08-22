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

const BASE_URL = "https://api.the-odds-api.com/v4";

const MARKET_LABELS: Record<MarketType, string> = {
  h2h: "Uitslag (1X2)",
  totals: "Over/Under",
  spreads: "Handicap",
};

type RawEvent = {
  id: string;
  sport_key: string;
  sport_title?: string;
  commence_time: string;
  home_team?: string;
  away_team?: string;
};

type RawOutcome = { name: string; price: number; point?: number };
type RawMarket = { key: string; outcomes: RawOutcome[] };
type RawBookmaker = { key: string; title: string; markets: RawMarket[] };
type RawEventWithOdds = RawEvent & { bookmakers: RawBookmaker[] };
type RawScoreEvent = {
  id: string;
  completed: boolean;
  scores?: { name: string; score: string }[] | null;
};

function toProviderEvent(e: RawEvent): ProviderEvent {
  return {
    externalId: e.id,
    sportKey: e.sport_key,
    sportLabel: e.sport_title ?? e.sport_key,
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

function aggregateMarkets(
  raw: RawEventWithOdds,
  marketTypes: MarketType[],
  strategy: OddsAggregationStrategy
): ProviderMarket[] {
  type Bucket = {
    line?: number;
    outcomeQuotes: Map<string, { odds: number; bookmakerKey: string }[]>;
  };
  const byType = new Map<string, Bucket>();

  for (const bookmaker of raw.bookmakers ?? []) {
    for (const market of bookmaker.markets ?? []) {
      if (!marketTypes.includes(market.key as MarketType)) continue;
      const bucket: Bucket = byType.get(market.key) ?? { outcomeQuotes: new Map() };
      for (const outcome of market.outcomes) {
        const list = bucket.outcomeQuotes.get(outcome.name) ?? [];
        list.push({ odds: outcome.price, bookmakerKey: bookmaker.key });
        bucket.outcomeQuotes.set(outcome.name, list);
        if (outcome.point !== undefined) bucket.line = outcome.point;
      }
      byType.set(market.key, bucket);
    }
  }

  return Array.from(byType.entries()).map(([type, bucket]) => ({
    type: type as MarketType,
    label: MARKET_LABELS[type as MarketType] ?? type,
    line: bucket.line,
    outcomes: Array.from(bucket.outcomeQuotes.entries()).map(([label, quotes]) => ({
      label,
      odds: pickOdds(quotes, strategy),
    })),
  }));
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
