import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { challenges } from "@drizzle/schema";
import { AwardMissionForm } from "./award-mission-form";
import { NewMissionForm } from "./new-mission-form";

export const metadata: Metadata = { title: "Missies" };

export default async function AdminMissionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const challenge = await db.query.challenges.findFirst({
    where: eq(challenges.id, id),
    with: {
      missions: { with: { completions: { with: { user: true } } } },
      participants: { with: { user: true } },
    },
  });
  if (!challenge) notFound();

  const players = challenge.participants.map((p) => ({ userId: p.userId, username: p.user.username }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Missies — {challenge.name}</h1>
      </div>

      <div className="rounded-lg border border-border p-4">
        <h2 className="mb-4 text-sm font-medium text-muted-foreground">Nieuwe missie</h2>
        <NewMissionForm challengeId={id} />
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Bestaande missies ({challenge.missions.length})
        </h2>
        {challenge.missions.map((mission) => (
          <Card key={mission.id}>
            <CardHeader className="gap-1">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm">{mission.title}</CardTitle>
                <Badge variant="secondary">{mission.type}</Badge>
              </div>
              <CardDescription>{mission.description}</CardDescription>
              <CardDescription className="tabular-nums">
                {mission.completions.length} gehaald
                {mission.maxWinners && ` / max ${mission.maxWinners}`}
                {mission.completions.length > 0 &&
                  ` — ${mission.completions.map((c) => c.user.username).join(", ")}`}
              </CardDescription>
            </CardHeader>
            <div className="px-4 pb-4">
              <AwardMissionForm missionId={mission.id} challengeId={id} players={players} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
