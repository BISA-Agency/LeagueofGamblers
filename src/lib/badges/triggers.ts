import { and, asc, desc, eq, inArray, lt, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { bets, challengeParticipants } from "@drizzle/schema";
import { awardBadgeBySlug } from "./award";

const WON_STATUSES = ["won", "half_won"] as const;

/**
 * Badge triggers that fire off a single settled bet (§5.8). Separate from the
 * mission engine on purpose: a badge is a permanent achievement with fixed
 * criteria, a mission is admin-configured and can pay out money. Both run
 * after the same event, neither depends on the other.
 *
 * Safe to call more than once for the same bet — awardBadgeBySlug is
 * idempotent.
 */
export async function evaluateBadgesForSettledBet(betId: string) {
  const bet = await db.query.bets.findFirst({
    where: eq(bets.id, betId),
    with: { selections: true },
  });
  if (!bet || bet.status === "open") return;
  // Proof bets only count once an admin approved them (§5.7).
  if (bet.kind === "proof" && bet.verificationStatus !== "approved") return;

  const { userId, challengeId } = bet;
  const isWin = (WON_STATUSES as readonly string[]).includes(bet.status);

  if (isWin) {
    if (bet.totalOdds >= 20) await awardBadgeBySlug("longshot", userId, challengeId);
    if (bet.type === "combi" && bet.selections.length >= 5) {
      await awardBadgeBySlug("combi-king", userId, challengeId);
    }
    if (bet.wasAllIn) await awardBadgeBySlug("all-in", userId, challengeId);

    // First winning settled bet of the whole challenge.
    const earlierWin = await db.query.bets.findFirst({
      where: and(
        eq(bets.challengeId, challengeId),
        inArray(bets.status, [...WON_STATUSES]),
        bet.settledAt ? lt(bets.settledAt, bet.settledAt) : undefined
      ),
      columns: { id: true },
      orderBy: asc(bets.settledAt),
    });
    if (!earlierWin) await awardBadgeBySlug("first-blood", userId, challengeId);
  }

  const settled = await db.query.bets.findMany({
    where: and(
      eq(bets.challengeId, challengeId),
      eq(bets.userId, userId),
      ne(bets.status, "open"),
      ne(bets.status, "void")
    ),
    columns: { status: true, settledAt: true },
    orderBy: desc(bets.settledAt),
    with: { selections: { columns: { sport: true } } },
  });

  const recentFive = settled.slice(0, 5);
  if (
    recentFive.length >= 5 &&
    recentFive.every((b) => (WON_STATUSES as readonly string[]).includes(b.status))
  ) {
    await awardBadgeBySlug("hot-streak", userId, challengeId);
  }

  const wins = settled.filter((b) => (WON_STATUSES as readonly string[]).includes(b.status)).length;
  if (settled.length >= 20 && wins / settled.length >= 0.6) {
    await awardBadgeBySlug("sharp", userId, challengeId);
  }

  const sports = new Set(settled.flatMap((b) => b.selections.map((s) => s.sport)));
  if (sports.size >= 5) await awardBadgeBySlug("scout", userId, challengeId);

  const participant = await db.query.challengeParticipants.findFirst({
    where: and(
      eq(challengeParticipants.challengeId, challengeId),
      eq(challengeParticipants.userId, userId)
    ),
    columns: { balance: true },
  });
  if (participant && participant.balance <= 0) {
    await awardBadgeBySlug("bust", userId, challengeId);
  }
}

/** Career badge: 10 approved proof bets with no rejection on record. */
export async function evaluateProofBetBadges(userId: string) {
  const proofBets = await db.query.bets.findMany({
    where: and(eq(bets.userId, userId), eq(bets.kind, "proof")),
    columns: { verificationStatus: true },
  });

  const approved = proofBets.filter((b) => b.verificationStatus === "approved").length;
  const rejected = proofBets.some((b) => b.verificationStatus === "rejected");

  if (approved >= 10 && !rejected) {
    await awardBadgeBySlug("clean-sheet", userId, null);
  }
}
