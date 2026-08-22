import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeIcon } from "@/components/badges/badge-icon";
import { LevelProgressBar } from "@/components/profile/level-progress-bar";
import { UserAvatar } from "@/components/profile/user-avatar";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { bets, profiles } from "@drizzle/schema";
import { createClient } from "@/lib/supabase/server";

const memberSinceFormatter = new Intl.DateTimeFormat("nl-NL", {
  month: "long",
  year: "numeric",
});

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

  const activeParticipation = profile.participations.find((p) => p.status === "active");
  const myBets = activeParticipation
    ? await db.query.bets.findMany({
        where: eq(bets.userId, profile.id),
      })
    : [];
  const settled = myBets.filter((b) => b.status !== "open");
  const won = settled.filter((b) => b.status === "won" || b.status === "half_won");
  const winrate = settled.length > 0 ? (won.length / settled.length) * 100 : 0;
  const totalWarnings = profile.participations.reduce((sum, p) => sum + p.warnings, 0);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <div className="flex items-center gap-4">
        <UserAvatar username={profile.username} avatarUrl={profile.avatarUrl} size={64} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold">{profile.username}</h1>
          {profile.statusText && (
            <p className="truncate text-sm text-muted-foreground">{profile.statusText}</p>
          )}
        </div>
        {isOwnProfile && (
          <Button asChild variant="outline" size="sm" className="h-11">
            <Link href="/app/profile/edit">Bewerken</Link>
          </Button>
        )}
      </div>

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
        {activeParticipation && (
          <>
            <div>
              <dt className="text-muted-foreground">Saldo ({activeParticipation.challenge.name})</dt>
              <dd className="tabular-nums">€{activeParticipation.balance.toLocaleString("nl-NL")}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Winrate</dt>
              <dd className="tabular-nums">
                {winrate.toFixed(0)}% ({won.length}/{settled.length})
              </dd>
            </div>
          </>
        )}
      </dl>

      {totalWarnings > 0 && (
        <p className="text-sm text-loss">
          {totalWarnings} waarschuwing{totalWarnings !== 1 ? "en" : ""}
        </p>
      )}
    </div>
  );
}
