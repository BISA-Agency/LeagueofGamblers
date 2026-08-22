import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { challengeParticipants, challenges, rankSnapshots } from "@drizzle/schema";

/** Snapshots today's balance + rank for every paid, active participant of every live challenge (§5.5). */
export async function runDailyRankSnapshots(date = new Date()) {
  const dateKey = date.toISOString().slice(0, 10); // yyyy-mm-dd

  const liveChallenges = await db.query.challenges.findMany({
    where: eq(challenges.status, "live"),
  });

  let written = 0;

  for (const challenge of liveChallenges) {
    const participants = await db.query.challengeParticipants.findMany({
      where: eq(challengeParticipants.challengeId, challenge.id),
    });

    const ranked = participants
      .filter((p) => p.paidBuyIn && (p.status === "active" || p.status === "bust"))
      .sort((a, b) => b.balance - a.balance);

    if (ranked.length === 0) continue;

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
  }

  return written;
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
