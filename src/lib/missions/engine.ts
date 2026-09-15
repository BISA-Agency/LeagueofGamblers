import { and, desc, eq, isNull, ne, or, sql } from "drizzle-orm";
import { logActivity } from "@/lib/activity/log";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications/create";
import {
  betSelections,
  bets,
  challengeParticipants,
  challenges,
  missionCompletions,
  missions,
  payments,
  profiles,
  userBadges,
  xpEvents,
  type Bet,
  type Mission,
} from "@drizzle/schema";
import { affordableReward } from "@/lib/settlement/payouts";
import { MISSION_TYPES, type CareerTotals, type MissionCheckContext } from "./types";

async function isMissionActive(mission: Mission, now: Date) {
  if (mission.validFrom && now < mission.validFrom) return false;
  if (mission.validTo && now > mission.validTo) return false;
  return true;
}

export async function alreadyCompleted(mission: Mission, userId: string, challengeId: string) {
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
  const paid =
    mission.rewardAmount && mission.challengeId !== null
      ? await payMissionRewardWithinBudget(challengeId, userId, mission.rewardAmount)
      : 0;

  await logActivity(challengeId, userId, "mission_completed", { title: mission.title });
  await createNotification({
    userId,
    type: "mission_completed",
    payload: { title: mission.title, reward: paid > 0 ? paid : null },
  });
}

/**
 * The missiebudget is a hard cap, not a hint. Everything committed so far
 * (pending and confirmed payouts) is summed under a lock on the challenge
 * row, so two missions completing at the same moment can't both squeeze
 * through the last few euros. Returns what was actually paid — possibly
 * less than the reward, possibly nothing.
 */
async function payMissionRewardWithinBudget(challengeId: string, userId: string, reward: number) {
  return db.transaction(async (tx) => {
    const [challenge] = await tx
      .select({ missionBudget: challenges.missionBudget })
      .from(challenges)
      .where(eq(challenges.id, challengeId))
      .for("update");
    if (!challenge) return 0;

    const [{ committed }] = await tx
      .select({ committed: sql<number>`coalesce(sum(${payments.amount}), 0)::float` })
      .from(payments)
      .where(
        and(
          eq(payments.challengeId, challengeId),
          eq(payments.direction, "payout_mission"),
          ne(payments.status, "rejected")
        )
      );

    const amount = affordableReward(reward, challenge.missionBudget, committed);
    if (amount <= 0) return 0;

    await tx.insert(payments).values({
      direction: "payout_mission",
      amount,
      challengeId,
      userId,
      status: "pending",
    });
    return amount;
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

    const ctx: MissionCheckContext = {
      bet,
      recentSettledBets: [],
      currentBalance: null,
      career: null,
    };
    if (definition.needsHistory) {
      ctx.recentSettledBets = await getRecentSettledBets(bet);
    }
    if (definition.needsCareer) {
      ctx.career = await getCareerTotals(bet.userId);
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

/**
 * Counted in the database rather than in memory: these are lifetime numbers
 * and a chain runs to 2000 bets. Only the sports query needs a join.
 */
async function getCareerTotals(userId: string): Promise<CareerTotals> {
  const settledBets = await db.$count(bets, and(eq(bets.userId, userId), ne(bets.status, "open")));
  const wonBets = await db.$count(
    bets,
    and(eq(bets.userId, userId), or(eq(bets.status, "won"), eq(bets.status, "half_won")))
  );
  const rows = await db
    .selectDistinct({ sport: betSelections.sport })
    .from(betSelections)
    .innerJoin(bets, eq(bets.id, betSelections.betId))
    .where(and(eq(bets.userId, userId), or(eq(bets.status, "won"), eq(bets.status, "half_won"))));

  return { settledBets, wonBets, sportsWon: rows.filter((r) => r.sport).length };
}

async function getRecentSettledBets(bet: Bet, limit = 50) {
  return db.query.bets.findMany({
    where: and(eq(bets.userId, bet.userId), eq(bets.challengeId, bet.challengeId), ne(bets.status, "open")),
    orderBy: desc(bets.settledAt),
    limit,
    with: { selections: true },
  });
}
