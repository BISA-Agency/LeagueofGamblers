import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { levelFromXp } from "@/lib/levels";
import { bets, profiles, xpEvents } from "@drizzle/schema";

/** Flat XP for having a bet settle at all, win or lose. The engine of long-term progress. */
export const BASE_XP_PER_BET = 5;

/** Scale of the performance term. See xpForSettledBet for why this is zero-sum at fair odds. */
export const PERFORMANCE_SCALE = 50;

/** Beyond this many settled bets in a day, the flat part stops paying — the performance part never does. */
export const DAILY_BASE_XP_BETS = 20;

export type XpBreakdown = { base: number; performance: number; total: number };

/**
 * XP for one settled bet.
 *
 * The performance term rewards the gap between what happened and what the
 * odds predicted, not the result itself. Winning at 10.00 beat a 10% forecast
 * and pays well; winning at 1.20 beat an 83% forecast and pays little. Losing
 * runs the same way round, which is why dropping a heavy favourite costs far
 * more than a longshot failing to land — the favourite was the mistake.
 *
 * The point of that shape: at fair odds the performance term averages to zero
 * for every price, so there is no quotation that farms XP faster. Expected XP
 * is BASE_XP_PER_BET a bet for everyone, and the only reliable way to earn
 * more is to actually beat the line.
 */
export function xpForSettledBet(
  status: string,
  totalOdds: number,
  baseApplies: boolean
): XpBreakdown | null {
  if (status === "void" || status === "open") return null;
  // Same convention the bet slip uses: a half win is a win, a half loss is a loss.
  const outcome = status === "won" || status === "half_won" ? 1 : 0;

  // Guard against a nonsense price rather than dividing by it.
  const implied = totalOdds >= 1.01 ? 1 / totalOdds : 1;
  const base = baseApplies ? BASE_XP_PER_BET : 0;
  const performance = Math.round(PERFORMANCE_SCALE * (outcome - implied));

  return { base, performance, total: base + performance };
}

function startOfToday(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Grants the XP for a settled bet, once. Safe to call from every settlement
 * path — auto settlement, admin override, proof-bet approval — because a bet
 * that already has an XP row is skipped.
 *
 * Proof bets are deliberately excluded until an admin approves them: the
 * player settles those themselves, so paying XP before approval would let
 * anyone mint it by claiming wins.
 */
export async function awardXpForSettledBet(betId: string): Promise<XpBreakdown | null> {
  const bet = await db.query.bets.findFirst({ where: eq(bets.id, betId) });
  if (!bet) return null;
  if (bet.kind === "proof" && bet.verificationStatus !== "approved") return null;

  const already = await db.query.xpEvents.findFirst({
    where: and(eq(xpEvents.refType, "bet"), eq(xpEvents.refId, betId)),
    columns: { id: true },
  });
  if (already) return null;

  const settledToday = await db.$count(
    xpEvents,
    and(
      eq(xpEvents.userId, bet.userId),
      eq(xpEvents.refType, "bet"),
      gte(xpEvents.createdAt, startOfToday())
    )
  );

  const breakdown = xpForSettledBet(bet.status, bet.totalOdds, settledToday < DAILY_BASE_XP_BETS);
  if (!breakdown) return null;

  const won = bet.status === "won" || bet.status === "half_won";
  await db.transaction(async (tx) => {
    // The row is written even when total is 0, because it is also what counts
    // against the daily cap and what makes this idempotent.
    await tx.insert(xpEvents).values({
      userId: bet.userId,
      amount: breakdown.total,
      reason: `${won ? "Gewonnen" : "Verloren"} @ ${bet.totalOdds.toFixed(2)}`,
      refType: "bet",
      refId: betId,
    });
    if (breakdown.total !== 0) {
      // XP can fall, but not below zero — a negative total on a profile reads
      // as a bug, and the level floor already carries the "you keep what you
      // earned" promise.
      await tx
        .update(profiles)
        .set({ xp: sql`greatest(0, ${profiles.xp} + ${breakdown.total})` })
        .where(eq(profiles.id, bet.userId));
    }
  });

  await raiseLevelFloor(bet.userId);
  return breakdown;
}

/** Records a new personal best level so later losses cannot demote past it. */
export async function raiseLevelFloor(userId: string) {
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, userId),
    columns: { xp: true, levelFloor: true },
  });
  if (!profile) return;

  const reached = levelFromXp(profile.xp);
  if (reached > profile.levelFloor) {
    await db.update(profiles).set({ levelFloor: reached }).where(eq(profiles.id, userId));
  }
}
