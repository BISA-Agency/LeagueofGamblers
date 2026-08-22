import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { summarizeBets } from "@/lib/stats/bets";
import {
  bets,
  challengeParticipants,
  challenges,
  missionCompletions,
  profiles,
  userBadges,
} from "@drizzle/schema";
import { getSnapshotsForUsers } from "./rank-snapshots";

export async function getWrappedData(challengeId: string, username: string) {
  const [challenge, profile] = await Promise.all([
    db.query.challenges.findFirst({ where: eq(challenges.id, challengeId) }),
    db.query.profiles.findFirst({ where: eq(profiles.username, username.toLowerCase()) }),
  ]);
  if (!challenge || !profile) return null;

  const participants = await db.query.challengeParticipants.findMany({
    where: and(
      eq(challengeParticipants.challengeId, challengeId),
      eq(challengeParticipants.paidBuyIn, true)
    ),
  });
  const me = participants.find((p) => p.userId === profile.id);
  if (!me) return null;

  const [playerBets, badges, missions, snapshots] = await Promise.all([
    db.query.bets.findMany({
      where: and(eq(bets.challengeId, challengeId), eq(bets.userId, profile.id)),
      orderBy: asc(bets.settledAt),
      with: { selections: true },
    }),
    db.query.userBadges.findMany({
      where: and(eq(userBadges.challengeId, challengeId), eq(userBadges.userId, profile.id)),
      with: { badge: true },
    }),
    db.query.missionCompletions.findMany({
      where: and(
        eq(missionCompletions.challengeId, challengeId),
        eq(missionCompletions.userId, profile.id)
      ),
      with: { mission: true },
    }),
    getSnapshotsForUsers(challengeId, [profile.id], 400),
  ]);

  const summary = summarizeBets(playerBets);
  const effectiveBalance = me.balance + summary.openStake;
  const rank =
    [...participants].sort((a, b) => b.balance - a.balance).findIndex((p) => p.userId === profile.id) +
    1;

  return {
    challenge,
    profile,
    rank,
    playerCount: participants.length,
    balance: me.balance,
    // Open stakes count back: usually zero by wrap time, but the page is
    // reachable during settling when a last bet may still be open.
    pl: effectiveBalance - challenge.startingBalance,
    roi:
      challenge.startingBalance > 0
        ? ((effectiveBalance - challenge.startingBalance) / challenge.startingBalance) * 100
        : 0,
    ...summary,
    badges: badges.map((b) => b.badge),
    missions: missions.map((m) => m.mission.title),
    balanceHistory: snapshots.map((s) => ({ date: s.date, balance: s.balance })),
  };
}
