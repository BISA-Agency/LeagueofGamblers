import type { MissionTypeDefinition } from "./shared";

export type ReferralsParams = { count: number };

/**
 * Registered so the admin picker and validation know the type exists, but it
 * is never evaluated per bet — a referral fires when somebody else pays a
 * buy-in. lib/referrals/evaluate.ts is what actually checks it.
 */
export const referrals: MissionTypeDefinition<ReferralsParams> = {
  key: "referrals",
  check: () => false,
};
