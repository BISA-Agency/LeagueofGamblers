import { and, desc, eq, isNull, ne, or, sql } from "drizzle-orm";
import { logActivity } from "@/lib/activity/log";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications/create";
import {
  bets,
  challengeParticipants,
  missionCompletions,
  missions,
  payments,
  profiles,
  userBadges,
  xpEvents,
  type Bet,
  type Mission,
} from "@drizzle/schema";
import { MISSION_TYPES, type MissionCheckContext } from "./types";

async function isMissionActive(mission: Mission, now: Date) {
  if (mission.validFrom && now < mission.validFrom) return false;
  if (mission.validTo && now > mission.validTo) return false;
  return true;
}

async function alreadyCompleted(mission: Mission, userId: string, challengeId: string) {
  // A League of Gamblers mission (challengeId null) is career-wide: once
  // completed in any challenge it stays completed. Challenge missions reset
  // per challenge.
  const scope =
    mission.challengeId === null
      ? and(eq(missionCompletions.missionId, mission.id), eq(missionCompletions.userId, userId))
      : and(
          eq(missionCompletions.missionId, mission.id),
          eq(missionCompletions.userId, userId),
          eq(missionCompletions.challengeId, challengeId)
        );
  const existing = await db.query.missionCompletions.findFirst({ where: scope });
  return !!existing;
}

export async function awardMission(
  mission: Mission,
  userId: string,
  challengeId: string,
  betId: string | null
) {
  await db.insert(missionCompletions).values({ missionId: mission.id, userId, challengeId, betId });

  if (mission.rewardXp) {
    await db.insert(xpEvents).values({
      userId,
      amount: mission.rewardXp,
      reason: `Missie: ${mission.title}`,
      refType: "mission",
      refId: mission.id,
    });
    await db
      .update(profiles)
      .set({ xp: sql`${profiles.xp} + ${mission.rewardXp}` })
      .where(eq(profiles.id, userId));
  }

  if (mission.rewardBadgeId) {
    await db
      .insert(userBadges)
      .values({ userId, badgeId: mission.rewardBadgeId, challengeId })
      .onConflictDoNothing();
  }

  // League of Gamblers missions are XP-only by design (§missies-split): money
  // comes out of a challenge's missiebudget, which a cross-challenge mission
  // doesn't have. The create-action refuses it too; this is the backstop.
  if (mission.rewardAmount && mission.challengeId !== null) {
    await db.insert(payments).values({
      direction: "payout_mission",
      amount: mission.rewardAmount,
      challengeId,
      userId,
      status: "pending",
    });
  }

  await logActivity(challengeId, userId, "mission_completed", { title: mission.title });
  await createNotification({
    userId,
    type: "mission_completed",
    payload: { title: mission.title, reward: mission.rewardAmount },
  });
}

/**
 * Runs every active mission against a bet that just got settled. Call this
 * right after any bet's status flips away from "open" (auto settlement,
 * admin override, or proof-bet self-settlement + approval).
 */
export async function evaluateMissionsForSettledBet(betId: string) {
  const bet = await db.query.bets.findFirst({
    where: eq(bets.id, betId),
    with: { selections: true },
  });
  if (!bet || bet.status === "open") return;
  // Proof bets only count toward missions once an admin has approved them (§5.7).
  if (bet.kind === "proof" && bet.verificationStatus !== "approved") return;

  const activeMissions = await db.query.missions.findMany({
    where: or(isNull(missions.challengeId), eq(missions.challengeId, bet.challengeId)),
  });

  const now = new Date();

  for (const mission of activeMissions) {
    const definition = MISSION_TYPES[mission.type];
    if (!definition) continue; // "manual" or an unknown type — never auto-evaluated

    if (!(await isMissionActive(mission, now))) continue;
    if (mission.appliesTo !== "both" && mission.appliesTo !== bet.kind) continue;
    if (!mission.repeatable && (await alreadyCompleted(mission, bet.userId, bet.challengeId))) {
      continue;
    }
    if (mission.maxWinners) {
      const winnerCount = await db.$count(missionCompletions, eq(missionCompletions.missionId, mission.id));
      if (winnerCount >= mission.maxWinners) continue;
    }

    const ctx: MissionCheckContext = { bet, recentSettledBets: [], currentBalance: null };
    if (definition.needsHistory) {
      ctx.recentSettledBets = await getRecentSettledBets(bet);
    }
    if (definition.needsBalance) {
      const participant = await db.query.challengeParticipants.findFirst({
        where: and(
          eq(challengeParticipants.challengeId, bet.challengeId),
          eq(challengeParticipants.userId, bet.userId)
        ),
      });
      ctx.currentBalance = participant?.balance ?? null;
    }

    if (definition.check(ctx, mission.params)) {
      await awardMission(mission, bet.userId, bet.challengeId, bet.id);
    }
  }
}

async function getRecentSettledBets(bet: Bet, limit = 50) {
  return db.query.bets.findMany({
    where: and(eq(bets.userId, bet.userId), eq(bets.challengeId, bet.challengeId), ne(bets.status, "open")),
    orderBy: desc(bets.settledAt),
    limit,
    with: { selections: true },
  });
}
