import type { Bet, BetSelection } from "@drizzle/schema";

export type MissionCheckContext = {
  bet: Bet & { selections: BetSelection[] };
  /** Settled bets for this user in this challenge, newest first, including
   * this bet itself. Only populated when the type definition sets
   * `needsHistory`. */
  recentSettledBets: (Bet & { selections: BetSelection[] })[];
  /** The participant's current balance, after this bet's settlement was
   * applied. Only populated when the type definition sets `needsBalance`. */
  currentBalance: number | null;
};

export type MissionTypeDefinition<Params = Record<string, unknown>> = {
  key: string;
  /** Fetch bet history for streak/volume-style checks — skipped otherwise. */
  needsHistory?: boolean;
  /** Fetch the post-settlement balance — skipped otherwise. */
  needsBalance?: boolean;
  check: (ctx: MissionCheckContext, params: Params) => boolean;
};
