import { and, eq, gte, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { getSnapshotsForUsers } from "@/lib/challenges/rank-snapshots";
import { awardMission } from "./engine";
import { TIME_BOUND_MISSION_TYPES, type TimeBoundContext } from "./time-bound";
import { bets, challengeParticipants, challenges, missionCompletions, missions } from "@drizzle/schema";

async function alreadyCompleted(missionId: string, userId: string, challengeId: string) {
  const existing = await db.query.missionCompletions.findFirst({
    where: and(
      eq(missionCompletions.missionId, missionId),
      eq(missionCompletions.userId, userId),
      eq(missionCompletions.challengeId, challengeId)
    ),
  });
  return !!existing;
}

/**
 * Daily counterpart to lib/missions/engine.ts — evaluates profit_day/
 * profit_week/survive/volume for every active participant of every live
 * challenge. Run this *after* the day's rank_snapshots have been written
 * (see /api/cron/snapshots), otherwise "today" is missing from the history
 * these types read.
 */
export async function evaluateTimeBoundMissions(now = new Date()) {
  // Scoped to this call — a bet count for (user, window) never changes
  // within a single run, but must not leak into the next cron invocation.
  const betCountCache = new Map<string, number>();

  async function betCountInWindow(userId: string, challengeId: string, days: number) {
    const cacheKey = `${userId}:${days}`;
    const cached = betCountCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const sinceDate = new Date(now.getTime() - days * 86_400_000);
    const count = await db.$count(
      bets,
      and(eq(bets.userId, userId), eq(bets.challengeId, challengeId), gte(bets.placedAt, sinceDate))
    );
    betCountCache.set(cacheKey, count);
    return count;
  }

  const liveChallenges = await db.query.challenges.findMany({
    where: eq(challenges.status, "live"),
  });

  let evaluated = 0;

  for (const challenge of liveChallenges) {
    const activeMissions = await db.query.missions.findMany({
      where: or(isNull(missions.challengeId), eq(missions.challengeId, challenge.id)),
    });
    const timeBoundMissions = activeMissions.filter((m) => TIME_BOUND_MISSION_TYPES[m.type]);
    if (timeBoundMissions.length === 0) continue;

    const participants = await db.query.challengeParticipants.findMany({
      where: and(
        eq(challengeParticipants.challengeId, challenge.id),
        eq(challengeParticipants.status, "active")
      ),
    });

    const snapshots = await getSnapshotsForUsers(
      challenge.id,
      participants.map((p) => p.userId),
      60
    );
    const snapshotsByUser = new Map<string, { date: string; balance: number }[]>();
    for (const s of snapshots) {
      const list = snapshotsByUser.get(s.userId) ?? [];
      list.push({ date: s.date, balance: s.balance });
      snapshotsByUser.set(s.userId, list);
    }

    for (const participant of participants) {
      for (const mission of timeBoundMissions) {
        const definition = TIME_BOUND_MISSION_TYPES[mission.type];
        if (mission.validFrom && now < mission.validFrom) continue;
        if (mission.validTo && now > mission.validTo) continue;
        if (
          !mission.repeatable &&
          (await alreadyCompleted(mission.id, participant.userId, challenge.id))
        ) {
          continue;
        }
        if (mission.maxWinners) {
          const winnerCount = await db.$count(
            missionCompletions,
            eq(missionCompletions.missionId, mission.id)
          );
          if (winnerCount >= mission.maxWinners) continue;
        }

        const params = mission.params as { window?: number };
        const windowDays = params.window ?? 7;

        const ctx: TimeBoundContext = {
          currentBalance: participant.balance,
          startingBalance: challenge.startingBalance,
          snapshots: snapshotsByUser.get(participant.userId) ?? [],
          betCountInWindow: () => {
            throw new Error("betCountInWindow is async — resolved below before check() runs");
          },
        };
        // volume is the only type that reads this — resolve it eagerly so
        // check() itself can stay a plain sync function.
        const resolvedCount = await betCountInWindow(participant.userId, challenge.id, windowDays);
        ctx.betCountInWindow = () => resolvedCount;

        if (definition.check(ctx, mission.params)) {
          await awardMission(mission, participant.userId, challenge.id, null);
        }
      }
      evaluated++;
    }
  }

  return evaluated;
}
