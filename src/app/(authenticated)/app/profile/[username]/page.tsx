import { and, count, desc, eq, inArray } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeIcon } from "@/components/badges/badge-icon";
import { ChallengeHistory, type ChallengeHistoryRow } from "@/components/profile/challenge-history";
import { FollowButton } from "@/components/profile/follow-button";
import { LevelProgressBar } from "@/components/profile/level-progress-bar";
import { UsernameWithFlag } from "@/components/profile/username-with-flag";
import { UserAvatar } from "@/components/profile/user-avatar";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { displayBalance, hasStarted } from "@/lib/challenges/stats";
import { getLevelInfo } from "@/lib/levels";
import { summarizeBets } from "@/lib/stats/bets";
import { bets, challengeParticipants, follows, payments, profiles } from "@drizzle/schema";
import { createClient } from "@/lib/supabase/server";

const memberSinceFormatter = new Intl.DateTimeFormat("nl-NL", {
  month: "long",
  year: "numeric",
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.username, username.toLowerCase()),
    columns: { username: true, xp: true, levelFloor: true },
  });
  if (!profile) return { title: "Profiel" };

  const level = getLevelInfo(profile.xp, profile.levelFloor);
  const description = `${level.label} · ${profile.xp} XP`;
  const images = [`/api/og/profile/${profile.username}`];

  return {
    title: profile.username,
    description,
    openGraph: { title: profile.username, description, images },
    twitter: { card: "summary_large_image", title: profile.username, description, images },
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.username, username.toLowerCase()),
    with: {
      badges: { with: { badge: true } },
      participations: { with: { challenge: true } },
    },
  });
  if (!profile) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwnProfile = user?.id === profile.id;

  const [[followerCount], [followingCount], existingFollow] = await Promise.all([
    db.select({ n: count() }).from(follows).where(eq(follows.followingId, profile.id)),
    db.select({ n: count() }).from(follows).where(eq(follows.followerId, profile.id)),
    user && !isOwnProfile
      ? db.query.follows.findFirst({
          where: and(eq(follows.followerId, user.id), eq(follows.followingId, profile.id)),
        })
      : Promise.resolve(undefined),
  ]);

  // Prize money and field size per challenge — what turns "#1" into
  // "#1 van de 9, €450".
  const challengeIds = profile.participations.map((p) => p.challengeId);
  const [prizeRows, fieldSizes] = await Promise.all([
    challengeIds.length > 0
      ? db.query.payments.findMany({
          where: and(
            eq(payments.userId, profile.id),
            eq(payments.direction, "payout_prize"),
            inArray(payments.challengeId, challengeIds)
          ),
          columns: { challengeId: true, amount: true },
        })
      : Promise.resolve([]),
    challengeIds.length > 0
      ? db
          .select({ challengeId: challengeParticipants.challengeId, n: count() })
          .from(challengeParticipants)
          .where(inArray(challengeParticipants.challengeId, challengeIds))
          .groupBy(challengeParticipants.challengeId)
      : Promise.resolve([]),
  ]);

  const prizeByChallenge = new Map<string, number>();
  for (const row of prizeRows) {
    prizeByChallenge.set(row.challengeId, (prizeByChallenge.get(row.challengeId) ?? 0) + row.amount);
  }
  const sizeByChallenge = new Map(fieldSizes.map((r) => [r.challengeId, r.n]));

  const historyRows: ChallengeHistoryRow[] = [...profile.participations]
    .sort((a, b) => b.challenge.startAt.getTime() - a.challenge.startAt.getTime())
    .map((p) => ({
      challengeId: p.challengeId,
      slug: p.challenge.slug,
      name: p.challenge.name,
      status: p.challenge.status,
      finalRank: p.finalRank,
      balance: displayBalance(p, p.challenge),
      started: hasStarted(p.challenge.status),
      paidBuyIn: p.paidBuyIn,
      prize: prizeByChallenge.get(p.challengeId) ?? 0,
      playerCount: sizeByChallenge.get(p.challengeId) ?? 0,
    }));

  const activeParticipation = profile.participations.find((p) => p.status === "active");
  // Scoped to the active challenge — these numbers are shown under that
  // challenge's heading, so pulling in bets from other challenges would make
  // the winrate mean something different from what the label says.
  const myBets = activeParticipation
    ? await db.query.bets.findMany({
        where: and(
          eq(bets.userId, profile.id),
          eq(bets.challengeId, activeParticipation.challengeId)
        ),
        orderBy: desc(bets.settledAt),
        with: { selections: true },
      })
    : [];
  const stats = summarizeBets(myBets);
  const totalWarnings = profile.participations.reduce((sum, p) => sum + p.warnings, 0);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <div className="flex items-center gap-4">
        <UserAvatar username={profile.username} avatarUrl={profile.avatarUrl} size={64} />
        <div className="min-w-0 flex-1">
          <h1 className="flex min-w-0 text-lg font-semibold">
            <UsernameWithFlag
              username={profile.username}
              country={profile.country}
              xp={profile.xp}
              levelFloor={profile.levelFloor}
            />
          </h1>
          {profile.statusText && (
            <p className="truncate text-sm text-muted-foreground">{profile.statusText}</p>
          )}
        </div>
        {isOwnProfile ? (
          <Button asChild variant="outline" size="sm" className="h-11">
            <Link href="/app/profile/edit">Bewerken</Link>
          </Button>
        ) : (
          user && (
            <FollowButton
              targetUserId={profile.id}
              targetUsername={profile.username}
              isFollowing={Boolean(existingFollow)}
            />
          )
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        <span className="tabular-nums font-medium text-foreground">{followerCount.n}</span> volgers
        {" · "}
        <span className="tabular-nums font-medium text-foreground">{followingCount.n}</span> volgend
      </p>

      <LevelProgressBar xp={profile.xp} />

      {profile.bio && <p className="text-sm">{profile.bio}</p>}

      {profile.badges.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {profile.badges.map((ub) => (
            <div key={ub.id} className="flex flex-col items-center gap-1" title={ub.badge.description}>
              <BadgeIcon icon={ub.badge.icon} rarity={ub.badge.rarity} size={44} />
              <span className="max-w-16 truncate text-center text-[10px] text-muted-foreground">
                {ub.badge.name}
              </span>
            </div>
          ))}
        </div>
      )}

      <ChallengeHistory rows={historyRows} isOwnProfile={isOwnProfile} />

      <dl className="grid grid-cols-2 gap-4 text-sm">
        {profile.favoriteClub && (
          <div>
            <dt className="text-muted-foreground">Favoriete club</dt>
            <dd>{profile.favoriteClub}</dd>
          </div>
        )}
        {profile.favoriteSport && (
          <div>
            <dt className="text-muted-foreground">Favoriete sport</dt>
            <dd>{profile.favoriteSport}</dd>
          </div>
        )}
        <div>
          <dt className="text-muted-foreground">Lid sinds</dt>
          <dd>{memberSinceFormatter.format(profile.createdAt)}</dd>
        </div>
      </dl>

      {activeParticipation && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            {activeParticipation.challenge.name}
          </h2>
          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Saldo</dt>
              <dd className="tabular-nums">
                €{activeParticipation.balance.toLocaleString("nl-NL")}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Winrate</dt>
              <dd className="tabular-nums">
                {stats.winrate.toFixed(0)}% ({stats.wonCount}/{stats.settledCount})
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Bets</dt>
              <dd className="tabular-nums">
                {stats.betsCount}
                {stats.openCount > 0 && ` (${stats.openCount} open)`}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Langste winreeks</dt>
              <dd className="tabular-nums">{stats.longestWinStreak}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Gem. quotering</dt>
              <dd className="tabular-nums">{stats.avgOdds.toFixed(2)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Hoogste gewonnen</dt>
              <dd className="tabular-nums">
                {stats.highestWonOdds > 0 ? stats.highestWonOdds.toFixed(2) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Enkel / combi</dt>
              <dd className="tabular-nums">
                {stats.singleCount} / {stats.combiCount}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Grootste winst</dt>
              <dd className="tabular-nums text-profit">
                {stats.biggestWin > 0 ? `+€${stats.biggestWin.toLocaleString("nl-NL")}` : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Totaal ingezet</dt>
              <dd className="tabular-nums">€{stats.totalStaked.toLocaleString("nl-NL")}</dd>
            </div>
          </dl>
        </section>
      )}

      {totalWarnings > 0 && (
        <p className="text-sm text-loss">
          {totalWarnings} waarschuwing{totalWarnings !== 1 ? "en" : ""}
        </p>
      )}
    </div>
  );
}
