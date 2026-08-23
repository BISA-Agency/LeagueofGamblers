import { eq } from "drizzle-orm";
import { alreadyCompleted, awardMission } from "@/lib/missions/engine";
import { db } from "@/lib/db";
import { missions, profiles } from "@drizzle/schema";
import { countConfirmedReferrals } from "./assign";
import type { ReferralsParams } from "@/lib/missions/types/referrals";

/**
 * The third evaluation channel. Missions are otherwise checked per settled bet
 * or nightly by cron; a referral mission fires on somebody else's payment
 * being approved, which fits neither.
 *
 * Called with the id of the player who just paid. Their inviter is the one who
 * might have earned something.
 */
export async function evaluateReferralMissions(paidUserId: string) {
  const invitee = await db.query.profiles.findFirst({
    where: eq(profiles.id, paidUserId),
    columns: { invitedBy: true },
  });
  if (!invitee?.invitedBy) return;

  const inviterId = invitee.invitedBy;
  const confirmed = await countConfirmedReferrals(inviterId);
  if (confirmed === 0) return;

  const referralMissions = await db.query.missions.findMany({
    where: eq(missions.type, "referrals"),
  });

  const now = new Date();
  for (const mission of referralMissions) {
    if (mission.validFrom && now < mission.validFrom) continue;
    if (mission.validTo && now > mission.validTo) continue;

    const params = mission.params as ReferralsParams;
    if (typeof params?.count !== "number" || confirmed < params.count) continue;

    // Referral missions are career-wide, so there is no challenge to scope
    // them to. They hang off whichever challenge the inviter is in, or the
    // one the invitee just paid for — awardMission needs a challengeId.
    const challengeId = await inviterChallengeId(inviterId);
    if (!challengeId) continue;

    // This runs on every approved payment, so without the guard a second
    // invitee would re-award the "one referral" tier. awardMission does not
    // dedupe on its own, because repeatable missions are a real thing.
    if (await alreadyCompleted(mission, inviterId, challengeId)) continue;

    await awardMission(mission, inviterId, challengeId, null);
  }
}

/** Any challenge the inviter takes part in, so the completion has somewhere to live. */
async function inviterChallengeId(inviterId: string): Promise<string | null> {
  const participation = await db.query.challengeParticipants.findFirst({
    where: (p, { eq: eqOp }) => eqOp(p.userId, inviterId),
    columns: { challengeId: true },
  });
  return participation?.challengeId ?? null;
}

