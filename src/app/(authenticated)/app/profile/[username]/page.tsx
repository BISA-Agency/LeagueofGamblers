import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { UserAvatar } from "@/components/profile/user-avatar";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { profiles } from "@drizzle/schema";
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
  });
  if (!profile) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwnProfile = user?.id === profile.id;

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

      {profile.bio && <p className="text-sm">{profile.bio}</p>}

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
        <div>
          <dt className="text-muted-foreground">Level</dt>
          <dd className="tabular-nums">{profile.level}</dd>
        </div>
      </dl>

      <p className="text-xs text-muted-foreground">
        Statistieken, badges en bet-historie volgen in een volgende fase.
      </p>
    </div>
  );
}
