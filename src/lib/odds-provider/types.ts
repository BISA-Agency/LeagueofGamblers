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

/**
 * Markets we can both price and settle. Everything here is decidable from a
 * final score, which is all getResults() gives us — that is the boundary, not
 * what The Odds API happens to offer. Player props, corners, cards and
 * half-time markets are deliberately absent: nothing in /scores can settle
 * them.
 */
export type MarketType =
  | "h2h"
  | "totals"
  | "spreads"
  | "team_totals"
  | "btts"
  | "double_chance"
  | "draw_no_bet";

/** Featured markets come from the bulk /odds call; the rest cost one request per event. */
export const FEATURED_MARKETS: MarketType[] = ["h2h", "totals", "spreads"];
export const ADDITIONAL_MARKETS: MarketType[] = [
  "team_totals",
  "btts",
  "double_chance",
  "draw_no_bet",
];

export type ProviderMarket = {
  type: MarketType;
  label: string;
  line?: number;
  /** Which team a line belongs to — team totals only. */
  team?: string;
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
  /**
   * Additional markets, one event at a time — The Odds API does not serve them
   * in bulk. Costs [markets actually returned] x [regions] per call, which is
   * why the import only asks for events close to kick-off.
   */
  getEventOdds(
    sportKey: string,
    eventExternalId: string,
    markets: MarketType[]
  ): Promise<{ markets: ProviderMarket[] } & UsageInfo>;
  getResults(sportKey: string, eventExternalIds: string[]): Promise<ProviderResult[]>;
}
