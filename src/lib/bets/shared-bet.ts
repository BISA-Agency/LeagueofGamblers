import { eq } from "drizzle-orm";
import { slipStatusOf } from "@/components/bets/slip-chrome";
import { db } from "@/lib/db";
import { bets } from "@drizzle/schema";

// Postgres throws on a malformed uuid rather than returning no rows, which
// would turn a mistyped share link into a 500. Check the shape first.
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A bet as a stranger sees it on /b/[id]. Deliberately narrow: the slip, who
 * placed it and which challenge it belongs to — no note, no bookmaker, no
 * screenshot. The share page and its OG card both read through here so the
 * link preview can never claim something the page doesn't show.
 */
export async function getSharedBet(id: string) {
  if (!UUID.test(id)) return null;

  const bet = await db.query.bets.findFirst({
    where: eq(bets.id, id),
    columns: {
      id: true,
      kind: true,
      type: true,
      stake: true,
      totalOdds: true,
      potentialPayout: true,
      status: true,
      placedAt: true,
    },
    with: {
      selections: {
        columns: {
          id: true,
          eventName: true,
          eventStart: true,
          marketLabel: true,
          selectionLabel: true,
          odds: true,
          result: true,
        },
      },
      user: { columns: { username: true, avatarUrl: true, country: true } },
      challenge: { columns: { id: true, name: true, slug: true } },
    },
  });

  return bet ?? null;
}

export type SharedBet = NonNullable<Awaited<ReturnType<typeof getSharedBet>>>;

const money = (n: number) =>
  `€${n.toLocaleString("nl-NL", {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;

/**
 * "won €3.115" — the half-sentence that follows the username, on the page and
 * in the link preview's title. One phrasing, so a share sheet and the page it
 * opens never disagree.
 */
export function sharedBetHeadline(bet: SharedBet): string {
  switch (slipStatusOf(bet.status)) {
    case "won":
      return `won ${money(bet.potentialPayout)}`;
    case "lost":
      return `verloor ${money(bet.stake)}`;
    case "void":
      return `kreeg ${money(bet.stake)} terug`;
    default:
      return `zet ${money(bet.stake)} in op ${bet.totalOdds.toFixed(2)}`;
  }
}
