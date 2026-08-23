/**
 * The referral ladder. Rewards are XP and status only — cash per signup on a
 * betting product is an affiliate scheme, which is both a regulatory problem
 * and precisely the incentive that produces fake accounts. The free entry at
 * ten is capped and cannot be cashed out.
 *
 * Kept here rather than read from the missions table so the profile panel can
 * show the ladder without a query, and so the seed has one source of truth.
 */
export const REFERRAL_TIERS = [
  { count: 1, label: "Ambassadeur", xp: 150 },
  { count: 3, label: "Ronselaar", xp: 400 },
  { count: 5, label: "Bouwer", xp: 1000 },
  { count: 10, label: "Gratis inleg", xp: 2500 },
] as const;
