import { eq, isNull, or } from "drizzle-orm";
import type { Metadata } from "next";
import { WeeklyStandings } from "@/components/missions/weekly-standings";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { getWeeklyStandings } from "@/lib/challenges/week";
import { challengeParticipants, missions, type Mission } from "@drizzle/schema";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Missies" };

const deadlineFormatter = new Intl.DateTimeFormat("nl-NL", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Amsterdam",
});

/** A mission with an end date is a weekmissie; without one it just runs. */
function bucketOf(mission: Mission, now: Date): "week" | "ongoing" | "expired" {
  if (mission.validTo && mission.validTo < now) return "expired";
  if (mission.validFrom && mission.validFrom > now) return "expired";
  return mission.validTo ? "week" : "ongoing";
}

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

  const [allMissions, standings] = await Promise.all([
    db.query.missions.findMany({
      where: or(isNull(missions.challengeId), eq(missions.challengeId, participation.challengeId)),
      with: { completions: { with: { user: true } } },
    }),
    getWeeklyStandings(participation.challengeId),
  ]);

  const now = new Date();
  const visible = allMissions.filter(
    (m) => !m.hidden || m.completions.some((c) => c.userId === user.id)
  );

  const sections = [
    { key: "week", title: "Deze week", items: visible.filter((m) => bucketOf(m, now) === "week") },
    { key: "ongoing", title: "Doorlopend", items: visible.filter((m) => bucketOf(m, now) === "ongoing") },
    { key: "expired", title: "Afgelopen", items: visible.filter((m) => bucketOf(m, now) === "expired") },
  ].filter((s) => s.items.length > 0);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Missies</h1>
        <p className="text-sm text-muted-foreground">{participation.challenge.name}</p>
      </div>

      <WeeklyStandings standings={standings} currentUserId={user.id} />

      {sections.length === 0 && (
        <p className="text-sm text-muted-foreground">Nog geen missies voor deze challenge.</p>
      )}

      {sections.map((section) => (
        <section key={section.key} className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">{section.title}</h2>
          {section.items.map((mission) => {
            const myCompletion = mission.completions.find((c) => c.userId === user.id);
            const full =
              mission.maxWinners !== null && mission.completions.length >= mission.maxWinners;

            return (
              <Card key={mission.id} className={section.key === "expired" ? "opacity-60" : undefined}>
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
                  {section.key === "week" && mission.validTo && (
                    <CardDescription>
                      Loopt tot {deadlineFormatter.format(mission.validTo)}
                    </CardDescription>
                  )}
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
        </section>
      ))}
    </div>
  );
}
