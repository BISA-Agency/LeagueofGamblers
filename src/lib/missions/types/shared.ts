import type { Bet, BetSelection } from "@drizzle/schema";

export type MissionCheckContext = {
  bet: Bet & { selections: BetSelection[] };
  /** Settled bets for this user in this challenge, newest first. Only
   * populated when the type definition sets `needsHistory`. */
  recentSettledBets: Bet[];
};

export type MissionTypeDefinition<Params = Record<string, unknown>> = {
  key: string;
  /** Fetch bet history for streak/volume-style checks — skipped otherwise. */
  needsHistory?: boolean;
  check: (ctx: MissionCheckContext, params: Params) => boolean;
};
