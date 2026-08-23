export type PrizeSplitEntry = { rank: number; percent: number };
export type PrizeTierRow = {
  minPlayers: number;
  maxPlayers: number | null;
  split: PrizeSplitEntry[];
};

/**
 * How many places get paid.
 *
 * A hand-written staffel runs out. The table stopped at 15 players, and the
 * sixteenth entrant turned a full pot into nothing at all: no tier matched, so
 * the split came back empty and the money went nowhere without an error. A
 * formula cannot run out.
 *
 * 12% of the field above 15, which lands the smallest prize comfortably above
 * the buy-in at every size from 16 to a thousand.
 */
export function prizePlaces(paidPlayerCount: number): number {
  if (paidPlayerCount <= 0) return 0;
  // A single paid entrant has nobody to beat; refunding them beats the app
  // quietly keeping the money.
  if (paidPlayerCount <= 6) return 1;
  if (paidPlayerCount <= 15) return 3;
  return Math.max(3, Math.round(paidPlayerCount * 0.12));
}

/**
 * Share per place, as fractions of the pot summing to 1.
 *
 * Weighted by 1/rank. It is worth knowing that this is not an arbitrary curve:
 * over three places it produces 54.5 / 27.3 / 18.2, near enough the 50/30/20
 * that was written by hand, so the formula agrees with the intuition it
 * replaces — and keeps agreeing at sizes nobody wants to hand-write.
 *
 * The winner's share falls as the field grows (54% at seven players, 19% at a
 * thousand) while the amount climbs, which is the right way round: beating a
 * thousand people is harder, but it should not need half of a huge pot.
 */
export function prizeShares(paidPlayerCount: number): number[] {
  const places = prizePlaces(paidPlayerCount);
  if (places === 0) return [];
  const weights = Array.from({ length: places }, (_, i) => 1 / (i + 1));
  const total = weights.reduce((sum, w) => sum + w, 0);
  return weights.map((w) => w / total);
}

/**
 * Splits a pot into whole cents that add up to exactly the pot.
 *
 * Rounding each prize on its own drifts: at 250 players it paid out a cent
 * less than came in, at 1000 a cent more. Largest remainder gives every place
 * its floor and hands the leftover cents to the places that lost the most in
 * the rounding, so the parts always reconcile with the whole.
 */
function allocate(pot: number, shares: number[]): number[] {
  if (shares.length === 0) return [];
  const cents = Math.round(pot * 100);
  if (cents <= 0) return shares.map(() => 0);

  const exact = shares.map((share) => share * cents);
  const floors = exact.map((value) => Math.floor(value));
  const remainder = cents - floors.reduce((sum, value) => sum + value, 0);

  exact
    .map((value, index) => ({ fraction: value - Math.floor(value), index }))
    .sort((a, b) => b.fraction - a.fraction)
    .slice(0, remainder)
    .forEach(({ index }) => floors[index]++);

  return floors.map((c) => c / 100);
}

/**
 * Concrete euro amounts per place.
 *
 * A matching row in prize_tiers wins, so a small challenge can still have its
 * split written by hand; the formula covers everything else, which means there
 * is no field size that pays nobody.
 */
export function calculatePrizeSplit(
  paidPlayerCount: number,
  pot: number,
  tiers: PrizeTierRow[]
): { rank: number; amount: number }[] {
  const tier = tiers.find(
    (t) =>
      paidPlayerCount >= t.minPlayers &&
      (t.maxPlayers === null || paidPlayerCount <= t.maxPlayers)
  );

  // Percentages are normalised rather than trusted to add up: a hand-edited
  // tier that sums to 95 would otherwise leave 5% of real money unassigned.
  const shares =
    tier && tier.split.length > 0
      ? normalise(tier.split.map((entry) => entry.percent))
      : prizeShares(paidPlayerCount);

  return allocate(pot, shares).map((amount, index) => ({ rank: index + 1, amount }));
}

function normalise(values: number[]): number[] {
  const total = values.reduce((sum, v) => sum + v, 0);
  if (total <= 0) return values.map(() => 0);
  return values.map((v) => v / total);
}
