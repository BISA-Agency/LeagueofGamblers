import { and, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { createNotifications } from "@/lib/notifications/create";
import {
  challengeParticipants,
  challenges,
  notifications,
  rankSnapshots,
} from "@drizzle/schema";

/** Rank per user on the most recent snapshot day before `dateKey`, for the "+1 omhoog" delta. */
async function previousRanks(challengeId: string, dateKey: string) {
  const [latest] = await db
    .select({ date: sql<string>`max(${rankSnapshots.date})` })
    .from(rankSnapshots)
    .where(and(eq(rankSnapshots.challengeId, challengeId), lt(rankSnapshots.date, dateKey)));

  if (!latest?.date) return new Map<string, number>();

  const rows = await db.query.rankSnapshots.findMany({
    where: and(eq(rankSnapshots.challengeId, challengeId), eq(rankSnapshots.date, latest.date)),
  });
  return new Map(rows.map((r) => [r.userId, r.rank]));
}

/** Snapshots today's balance + rank for every paid, active participant of every live challenge (§5.5). */
export async function runDailyRankSnapshots(date = new Date()) {
  const dateKey = date.toISOString().slice(0, 10); // yyyy-mm-dd

  const liveChallenges = await db.query.challenges.findMany({
    where: eq(challenges.status, "live"),
  });

  let written = 0;
  let notified = 0;

  for (const challenge of liveChallenges) {
    const participants = await db.query.challengeParticipants.findMany({
      where: eq(challengeParticipants.challengeId, challenge.id),
    });

    const ranked = participants
      .filter((p) => p.paidBuyIn && (p.status === "active" || p.status === "bust"))
      .sort((a, b) => b.balance - a.balance);

    if (ranked.length === 0) continue;

    const previous = await previousRanks(challenge.id, dateKey);

    await db
      .insert(rankSnapshots)
      .values(
        ranked.map((p, i) => ({
          challengeId: challenge.id,
          userId: p.userId,
          date: dateKey,
          balance: p.balance,
          rank: i + 1,
        }))
      )
      .onConflictDoUpdate({
        target: [rankSnapshots.challengeId, rankSnapshots.userId, rankSnapshots.date],
        set: {
          balance: sql`excluded.balance`,
          rank: sql`excluded.rank`,
        },
      });

    written += ranked.length;

    // The snapshot upsert is idempotent but notifications aren't, so a re-run
    // on the same day must not send everyone a second rank update.
    const alreadyNotified = await db.query.notifications.findMany({
      where: and(
        eq(notifications.type, "rank_update"),
        inArray(
          notifications.userId,
          ranked.map((p) => p.userId)
        ),
        gte(notifications.createdAt, new Date(`${dateKey}T00:00:00.000Z`))
      ),
      columns: { userId: true },
    });
    const skip = new Set(alreadyNotified.map((n) => n.userId));

    const pending = ranked
      .map((p, i) => ({ participant: p, rank: i + 1 }))
      .filter(({ participant }) => !skip.has(participant.userId))
      .map(({ participant, rank }) => ({
        userId: participant.userId,
        type: "rank_update" as const,
        payload: {
          rank,
          previousRank: previous.get(participant.userId) ?? null,
          balance: participant.balance,
          challengeName: challenge.name,
          challengeSlug: challenge.slug,
        },
      }));

    await createNotifications(pending);
    notified += pending.length;
  }

  return { written, notified };
}

export async function getSnapshotsForUsers(challengeId: string, userIds: string[], limitDays = 30) {
  if (userIds.length === 0) return [];
  return db.query.rankSnapshots.findMany({
    where: (s, { and: andOp, eq: eqOp }) =>
      andOp(eqOp(s.challengeId, challengeId), inArray(s.userId, userIds)),
    orderBy: (s, { asc }) => asc(s.date),
    limit: limitDays * userIds.length,
  });
}
