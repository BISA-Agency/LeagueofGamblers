export type TimeBoundContext = {
  currentBalance: number;
  startingBalance: number;
  /** This user's snapshots for the challenge, ascending by date, today included. */
  snapshots: { date: string; balance: number }[];
  betCountInWindow: (days: number) => number;
};

export type TimeBoundMissionTypeDefinition<Params = Record<string, unknown>> = {
  key: string;
  check: (ctx: TimeBoundContext, params: Params) => boolean;
};
