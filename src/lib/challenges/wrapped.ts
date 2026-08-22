import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  bets,
  challengeParticipants,
  challenges,
  missionCompletions,
  profiles,
  userBadges,
  type Bet,
  type BetSelection,
} from "@drizzle/schema";
import { getSnapshotsForUsers } from "./rank-snapshots";

type BetWithSelections = Bet & { selections: BetSelection[] };

function profitOf(bet: Bet): number {
  switch (bet.status) {
    case "won":
      return bet.potentialPayout - bet.stake;
    case "half_won":
      return (bet.potentialPayout - bet.stake) / 2;
    case "half_lost":
      return -bet.stake / 2;
    case "lost":
      return -bet.stake;
    default:
      return 0;
  }
}

function longestWinStreak(settled: Bet[]): number {
  let best = 0;
  let run = 0;
  for (const bet of settled) {
    if (bet.status === "won" || bet.status === "half_won") {
      run += 1;
      best = Math.max(best, run);
    } else if (bet.status !== "void") {
      run = 0;
    }
  }
  return best;
}

function favoriteSport(playerBets: BetWithSelections[]): string | null {
  const counts = new Map<string, number>();
  for (const bet of playerBets) {
    for (const s of bet.selections) {
      counts.set(s.sport, (counts.get(s.sport) ?? 0) + 1);
    }
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return top?.[0] ?? null;
}

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

  const settled = playerBets.filter((b) => b.status !== "open" && b.status !== "void");
  const won = settled.filter((b) => b.status === "won" || b.status === "half_won");
  const profits = settled.map(profitOf);
  const wonOdds = won.map((b) => b.totalOdds);

  const rank =
    [...participants].sort((a, b) => b.balance - a.balance).findIndex((p) => p.userId === profile.id) +
    1;

  return {
    challenge,
    profile,
    rank,
    playerCount: participants.length,
    balance: me.balance,
    pl: me.balance - challenge.startingBalance,
    roi:
      challenge.startingBalance > 0
        ? ((me.balance - challenge.startingBalance) / challenge.startingBalance) * 100
        : 0,
    betsCount: playerBets.length,
    winrate: settled.length > 0 ? (won.length / settled.length) * 100 : 0,
    biggestWin: profits.length > 0 ? Math.max(0, ...profits) : 0,
    biggestLoss: profits.length > 0 ? Math.min(0, ...profits) : 0,
    totalStaked: playerBets.reduce((sum, b) => sum + b.stake, 0),
    avgOdds:
      playerBets.length > 0
        ? playerBets.reduce((sum, b) => sum + b.totalOdds, 0) / playerBets.length
        : 0,
    highestWonOdds: wonOdds.length > 0 ? Math.max(...wonOdds) : 0,
    longestWinStreak: longestWinStreak(settled),
    favoriteSport: favoriteSport(playerBets),
    badges: badges.map((b) => b.badge),
    missions: missions.map((m) => m.mission.title),
    balanceHistory: snapshots.map((s) => ({ date: s.date, balance: s.balance })),
  };
}
