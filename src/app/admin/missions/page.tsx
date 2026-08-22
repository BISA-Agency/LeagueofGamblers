import { isNull } from "drizzle-orm";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { missions } from "@drizzle/schema";
import { NewMissionForm } from "../challenges/[id]/missions/new-mission-form";

export const metadata: Metadata = { title: "LoG-missies" };

/**
 * League of Gamblers missions (§missies-split): career-wide, once ever,
 * XP-only. Money missions live under each challenge's own missions page,
 * because their prizes come out of that challenge's missiebudget.
 */
export default async function AdminGeneralMissionsPage() {
  const generalMissions = await db.query.missions.findMany({
    where: isNull(missions.challengeId),
    with: { completions: { with: { user: { columns: { username: true } } } } },
    orderBy: (m, { asc }) => asc(m.title),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">League of Gamblers-missies</h1>
        <p className="text-sm text-muted-foreground">
          Gelden voor iedereen, in elke challenge, en zijn één keer te behalen. Beloning is
          XP (en eventueel een badge) — geldmissies maak je bij de challenge zelf aan.
        </p>
      </div>

      <div className="rounded-lg border border-border p-4">
        <h2 className="mb-4 text-sm font-medium text-muted-foreground">Nieuwe LoG-missie</h2>
        <NewMissionForm challengeId={null} />
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          Actieve LoG-missies ({generalMissions.length})
        </h2>
        {generalMissions.length === 0 && (
          <p className="text-sm text-muted-foreground">Nog geen LoG-missies.</p>
        )}
        {generalMissions.map((mission) => (
          <Card key={mission.id}>
            <CardHeader className="gap-1">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-sm">{mission.title}</CardTitle>
                <Badge variant="secondary">{mission.type}</Badge>
              </div>
              <CardDescription>{mission.description}</CardDescription>
              <CardDescription className="tabular-nums">
                {mission.rewardXp ? `${mission.rewardXp} XP` : "Geen XP ingesteld"}
                {` · ${mission.completions.length}× behaald`}
                {mission.completions.length > 0 &&
                  ` (${[...new Set(mission.completions.map((c) => c.user.username))].join(", ")})`}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>
    </div>
  );
}
