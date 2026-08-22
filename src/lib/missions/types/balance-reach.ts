import type { MissionTypeDefinition } from "./shared";

export type BalanceReachParams = { amount: number };

export const balanceReach: MissionTypeDefinition<BalanceReachParams> = {
  key: "balance_reach",
  needsBalance: true,
  check: (ctx, params) => ctx.currentBalance !== null && ctx.currentBalance >= params.amount,
};
