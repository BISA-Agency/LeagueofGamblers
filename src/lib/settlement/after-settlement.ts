import { eq } from "drizzle-orm";
import { evaluateBadgesForSettledBet } from "@/lib/badges/triggers";
import { db } from "@/lib/db";
import { evaluateMissionsForSettledBet } from "@/lib/missions/engine";
import { createNotification } from "@/lib/notifications/create";
import { profitOf } from "@/lib/stats/bets";
import { awardXpForSettledBet } from "@/lib/xp/award";
import { bets } from "@drizzle/schema";

export type PostSettlementOptions = {
  /**
   * Whether to tell the player their bet resolved. False on the paths where
   * they resolved it themselves — a proof bet you just settled by hand needs
   * no notification about its own outcome.
   */
  notifyPlayer?: boolean;
};

/**
 * Everything that reacts to a bet leaving "open". Call this instead of the
 * individual evaluators so a new kind of check only has to be wired in once,
 * rather than at every settlement path (auto settlement, admin override,
 * proof-bet self-settlement, proof-bet approval).
 */
export async function runPostSettlementChecks(
  betId: string,
  { notifyPlayer = true }: PostSettlementOptions = {}
) {
  // XP first: a mission that fires off the same bet then lands on top of it,
  // and awardXpForSettledBet skips proof bets until an admin approves them.
  await awardXpForSettledBet(betId);
  await evaluateMissionsForSettledBet(betId);
  await evaluateBadgesForSettledBet(betId);
  if (notifyPlayer) await notifySettledBet(betId);
}

/**
 * The moment the whole app is built around: a bet came in. Kept out of the
 * transaction and never allowed to throw — a failed notification must not
 * roll back a settled bet.
 */
async function notifySettledBet(betId: string) {
  try {
    const bet = await db.query.bets.findFirst({
      where: eq(bets.id, betId),
      with: { selections: { columns: { eventName: true } } },
    });
    // Void bets were refunded; there is no result to announce.
    if (!bet || bet.status === "open" || bet.status === "void") return;

    const won = bet.status === "won" || bet.status === "half_won";
    await createNotification({
      userId: bet.userId,
      type: "bet_settled",
      payload: {
        betId,
        won: won ? 1 : 0,
        profit: profitOf(bet),
        odds: bet.totalOdds,
        eventName:
          bet.selections.length > 1
            ? `Combi van ${bet.selections.length}`
            : (bet.selections[0]?.eventName ?? null),
      },
    });
  } catch (err) {
    console.error(
      "[notifications] melding over afgerekende bet mislukt:",
      err instanceof Error ? err.message : err
    );
  }
}
