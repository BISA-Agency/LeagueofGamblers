export type ProviderEvent = {
  externalId: string;
  sportKey: string;
  sportLabel: string;
  competition?: string;
  homeTeam?: string;
  awayTeam?: string;
  name: string;
  startsAt: Date;
};

export type ProviderOutcome = {
  label: string;
  odds: number;
};

export type MarketType = "h2h" | "totals" | "spreads";

export type ProviderMarket = {
  type: MarketType;
  label: string;
  line?: number;
  outcomes: ProviderOutcome[];
};

export type ProviderEventOdds = {
  event: ProviderEvent;
  markets: ProviderMarket[];
};

export type ProviderResult = {
  externalId: string;
  completed: boolean;
  scores?: { name: string; score: number }[];
};

export type UsageInfo = {
  creditsUsed: number | null;
  creditsRemaining: number | null;
};

// One quote per market, aggregated across bookmakers (§5.3) — default is
// "highest", configurable via ODDS_AGGREGATION_STRATEGY.
export type OddsAggregationStrategy =
  | { mode: "highest" }
  | { mode: "average" }
  | { mode: "reference"; bookmakerKey: string };

export type ProviderSport = {
  key: string;
  title: string;
  group: string;
  /** In season right now. Out-of-season competitions still exist and come
   * back — the Champions League is inactive in August and live in September. */
  active: boolean;
};

export interface OddsProvider {
  /** Free/no-credit catalogue of what this provider currently offers. */
  listSports(): Promise<ProviderSport[]>;
  /** Free/no-credit event listing for the given window. */
  listEvents(sportKey: string, from: Date, to: Date): Promise<ProviderEvent[]>;
  /** Costs provider credits — only call this from the weekly import flow. */
  getOdds(
    sportKey: string,
    markets: MarketType[]
  ): Promise<{ events: ProviderEventOdds[] } & UsageInfo>;
  getResults(sportKey: string, eventExternalIds: string[]): Promise<ProviderResult[]>;
}
