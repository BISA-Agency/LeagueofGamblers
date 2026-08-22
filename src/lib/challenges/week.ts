import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { challengeParticipants, challenges, rankSnapshots } from "@drizzle/schema";

const amsterdamDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam" });

/** yyyy-mm-dd of the Monday of the week `now` falls in, in Amsterdam time. */
export function currentWeekStartKey(now = new Date()): string {
  const today = new Date(`${amsterdamDate.format(now)}T00:00:00Z`);
  const daysSinceMonday = (today.getUTCDay() + 6) % 7;
  today.setUTCDate(today.getUTCDate() - daysSinceMonday);
  return today.toISOString().slice(0, 10);
}

export type WeeklyStanding = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  gain: number;
};

/**
 * Who gained the most balance since Monday. The Monday snapshot is the
 * baseline; before the first snapshot exists (week one, or a player who
 * joined mid-week) the challenge's starting balance stands in.
 */
export async function getWeeklyStandings(challengeId: string): Promise<WeeklyStanding[]> {
  const weekStart = currentWeekStartKey();

  const [challenge, participants, baseline] = await Promise.all([
    db.query.challenges.findFirst({ where: eq(challenges.id, challengeId) }),
    db.query.challengeParticipants.findMany({
      where: and(
        eq(challengeParticipants.challengeId, challengeId),
        eq(challengeParticipants.paidBuyIn, true)
      ),
      with: { user: true },
    }),
    db.query.rankSnapshots.findMany({
      where: and(eq(rankSnapshots.challengeId, challengeId), eq(rankSnapshots.date, weekStart)),
    }),
  ]);

  if (!challenge) return [];
  const baselineByUser = new Map(baseline.map((s) => [s.userId, s.balance]));

  return participants
    .map((p) => ({
      userId: p.userId,
      username: p.user.username,
      avatarUrl: p.user.avatarUrl,
      gain: p.balance - (baselineByUser.get(p.userId) ?? challenge.startingBalance),
    }))
    .sort((a, b) => b.gain - a.gain);
}
