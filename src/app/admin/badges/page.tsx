import type { Metadata } from "next";
import { BadgeIcon } from "@/components/badges/badge-icon";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { AwardBadgeForm } from "./award-badge-form";
import { NewBadgeForm } from "./new-badge-form";

export const metadata: Metadata = { title: "Badges" };

export default async function AdminBadgesPage() {
  const [allBadges, allProfiles] = await Promise.all([
    db.query.badges.findMany({ orderBy: (b, { asc }) => asc(b.name) }),
    db.query.profiles.findMany({ orderBy: (p, { asc }) => asc(p.username) }),
  ]);

  const players = allProfiles.map((p) => ({ userId: p.id, username: p.username }));

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold tracking-tight">Badges</h1>

      <div className="rounded-lg border border-border p-4">
        <h2 className="mb-4 text-sm font-medium text-muted-foreground">Nieuwe custom badge</h2>
        <NewBadgeForm />
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Alle badges ({allBadges.length})
        </h2>
        {allBadges.map((badge) => (
          <div
            key={badge.id}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-4"
          >
            <BadgeIcon icon={badge.icon} rarity={badge.rarity} size={40} />
            <div className="min-w-0 flex-1 basis-40">
              {/* basis-40 lets the award form drop to its own line on a phone
                  instead of squeezing the row past the viewport. */}
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{badge.name}</p>
                <Badge variant="secondary" className="capitalize">
                  {badge.rarity}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{badge.description}</p>
            </div>
            <AwardBadgeForm badgeId={badge.id} players={players} />
          </div>
        ))}
      </div>
    </div>
  );
}
