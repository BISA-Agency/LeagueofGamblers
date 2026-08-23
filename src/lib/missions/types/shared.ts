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
  /**
   * All-time totals across every challenge, as counts rather than rows —
   * a chain like "win 250 bets" cannot be answered from the 50-row history
   * window, and loading a career of bets to count them would be worse.
   * Only populated when the type definition sets `needsCareer`.
   */
  career: CareerTotals | null;
};

export type CareerTotals = {
  settledBets: number;
  wonBets: number;
  /** Distinct sports the player has ever won in. */
  sportsWon: number;
};

export type MissionTypeDefinition<Params = Record<string, unknown>> = {
  key: string;
  /** Fetch bet history for streak/volume-style checks — skipped otherwise. */
  needsHistory?: boolean;
  /** Fetch the post-settlement balance — skipped otherwise. */
  needsBalance?: boolean;
  /** Fetch all-time counts — skipped otherwise. */
  needsCareer?: boolean;
  check: (ctx: MissionCheckContext, params: Params) => boolean;
};
