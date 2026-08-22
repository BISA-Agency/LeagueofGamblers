import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { hasStarted } from "./stats";
import { bets, challengeParticipants, challenges, rankSnapshots } from "@drizzle/schema";

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

  const [challenge, participants, baseline, openBets] = await Promise.all([
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
    db.query.bets.findMany({
      where: and(eq(bets.challengeId, challengeId), eq(bets.status, "open")),
      columns: { userId: true, stake: true },
    }),
  ]);

  if (!challenge) return [];
  // Before the challenge goes live nobody has a balance yet, so every row
  // would read as -€10.000. There's also no week to have won.
  if (!hasStarted(challenge.status)) return [];

  const baselineByUser = new Map(baseline.map((s) => [s.userId, s.balance]));
  // Stakes in open bets left the balance at placement but aren't losses yet.
  const openStakeByUser = new Map<string, number>();
  for (const b of openBets) {
    openStakeByUser.set(b.userId, (openStakeByUser.get(b.userId) ?? 0) + b.stake);
  }

  return participants
    .map((p) => ({
      userId: p.userId,
      username: p.user.username,
      avatarUrl: p.user.avatarUrl,
      gain:
        p.balance +
        (openStakeByUser.get(p.userId) ?? 0) -
        (baselineByUser.get(p.userId) ?? challenge.startingBalance),
    }))
    .sort((a, b) => b.gain - a.gain);
}
