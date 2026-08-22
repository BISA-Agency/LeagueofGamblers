import { eq, isNull, or } from "drizzle-orm";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { challengeParticipants, missions } from "@drizzle/schema";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Missies" };

export default async function MissionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const participation = await db.query.challengeParticipants.findFirst({
    where: eq(challengeParticipants.userId, user.id),
    with: { challenge: true },
  });

  if (!participation) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-lg font-semibold">Missies</h1>
        <p className="mt-2 text-sm text-muted-foreground">Je doet nog niet mee aan een challenge.</p>
      </div>
    );
  }

  const allMissions = await db.query.missions.findMany({
    where: or(isNull(missions.challengeId), eq(missions.challengeId, participation.challengeId)),
    with: { completions: { with: { user: true } } },
  });

  const visible = allMissions.filter(
    (m) => !m.hidden || m.completions.some((c) => c.userId === user.id)
  );

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Missies</h1>
        <p className="text-sm text-muted-foreground">{participation.challenge.name}</p>
      </div>

      {visible.length === 0 && (
        <p className="text-sm text-muted-foreground">Nog geen missies voor deze challenge.</p>
      )}

      <div className="space-y-2">
        {visible.map((mission) => {
          const myCompletion = mission.completions.find((c) => c.userId === user.id);
          const full = mission.maxWinners !== null && mission.completions.length >= mission.maxWinners;

          return (
            <Card key={mission.id}>
              <CardHeader className="gap-1">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm">{mission.title}</CardTitle>
                  {myCompletion ? (
                    <Badge className="border-profit/30 bg-profit/15 text-profit">Behaald</Badge>
                  ) : full ? (
                    <Badge variant="secondary">Vol</Badge>
                  ) : null}
                </div>
                <CardDescription>{mission.description}</CardDescription>
                <CardDescription className="tabular-nums">
                  {[
                    mission.rewardAmount && `€${mission.rewardAmount}`,
                    mission.rewardXp && `${mission.rewardXp} XP`,
                    mission.rewardBadgeId && "badge",
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Geen beloning ingesteld"}
                  {mission.completions.length > 0 &&
                    ` · behaald door ${mission.completions.map((c) => c.user.username).join(", ")}`}
                </CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
