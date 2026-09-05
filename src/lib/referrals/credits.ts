import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { challenges, profiles, referralPayouts } from "@drizzle/schema";

/**
 * Referral credit: what someone earns for bringing a player in.
 *
 * Deliberately computed on demand and never stored. Nothing is written, no
 * table is added, no balance moves — so this whole idea can be deleted again
 * by removing three files, which is the point while it is still being looked
 * at rather than used.
 *
 * That also means it is a preview, not a ledger. A real version needs rows:
 * one per earned credit, marked when it is spent, or there is no way to tell
 * a paid-out credit from an unpaid one and no trail when somebody disputes it.
 * Do not switch this on for players as-is.
 */

/**
 * How much of the platform fee goes back to whoever brought the player in.
 *
 * Half, so the fee is split down the middle with whoever brought the player
 * in. The ceiling is what matters more than the number: a share of the fee can
 * never cost more than it earned, and with no referrals it costs nothing.
 *
 * It is also why fraud does not pay — a fake account costs a €100 buy-in to
 * earn €5, and no amount of policing beats an incentive that is upside down to
 * begin with.
 */
export const CREDIT_SHARE_OF_FEE = 0.5;

export type ReferralCreditEntry = {
  inviteeUsername: string;
  challengeName: string;
  challengeStatus: string;
  buyIn: number;
  feePercent: number;
  credit: number;
};

export type ReferralCredits = {
  entries: ReferralCreditEntry[];
  /** Everything earned, ever. */
  total: number;
  /** Already sent in crypto, from the referral_payouts table. */
  paidOut: number;
  /** Earned minus paid — what is still owed. */
  outstanding: number;
  /** The buy-in this credit could be spent on, if there is one on offer. */
  nextBuyIn: number | null;
  nextChallengeName: string | null;
  /**
   * What can actually come off that buy-in. Capped at the buy-in itself:
   * credit is a discount, and a discount that goes past zero would be a
   * payout — a different thing entirely, with a different set of rules
   * attached to it.
   */
  applicable: number;
};

export async function getReferralCredits(userId: string): Promise<ReferralCredits> {
  const invitees = await db.query.profiles.findMany({
    where: eq(profiles.invitedBy, userId),
    columns: { username: true },
    with: {
      participations: {
        columns: { paidBuyIn: true },
        with: { challenge: true },
      },
    },
  });

  const entries: ReferralCreditEntry[] = [];
  for (const invitee of invitees) {
    for (const participation of invitee.participations) {
      // Paid only. An invite that never turned into money earns nothing,
      // which is the same rule the XP ladder already uses.
      if (!participation.paidBuyIn) continue;
      const challenge = participation.challenge;
      const fee = (challenge.buyInAmount * challenge.platformFeePercent) / 100;
      entries.push({
        inviteeUsername: invitee.username,
        challengeName: challenge.name,
        challengeStatus: challenge.status,
        buyIn: challenge.buyInAmount,
        feePercent: challenge.platformFeePercent,
        credit: Math.round(fee * CREDIT_SHARE_OF_FEE * 100) / 100,
      });
    }
  }

  entries.sort((a, b) => a.challengeName.localeCompare(b.challengeName, "nl"));
  const total = Math.round(entries.reduce((sum, e) => sum + e.credit, 0) * 100) / 100;

  // The one thing that has to be written down: sending the same commission
  // twice is the only mistake here that costs real money.
  const paidRows = await db.query.referralPayouts.findMany({
    where: eq(referralPayouts.userId, userId),
    columns: { amount: true },
  });
  const paidOut = Math.round(paidRows.reduce((sum, r) => sum + r.amount, 0) * 100) / 100;
  const outstanding = Math.round((total - paidOut) * 100) / 100;

  // The next challenge you could actually spend it on.
  const upcoming = await db.query.challenges.findFirst({
    where: eq(challenges.status, "open"),
    orderBy: (c, { asc }) => asc(c.startAt),
    columns: { name: true, buyInAmount: true },
  });

  return {
    entries,
    total,
    paidOut,
    outstanding,
    nextBuyIn: upcoming?.buyInAmount ?? null,
    nextChallengeName: upcoming?.name ?? null,
    applicable: upcoming ? Math.min(outstanding, upcoming.buyInAmount) : 0,
  };
}
