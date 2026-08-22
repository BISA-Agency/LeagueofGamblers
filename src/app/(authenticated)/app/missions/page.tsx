import { and, desc, eq, isNull, or } from "drizzle-orm";
import type { Metadata } from "next";
import { WeeklyStandings } from "@/components/missions/weekly-standings";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { db } from "@/lib/db";
import { getActiveParticipation } from "@/lib/challenges/active";
import { getWeeklyStandings } from "@/lib/challenges/week";
import { getMissionProgress, type MissionProgressContext } from "@/lib/missions/progress";
import { bets, missions, type Mission } from "@drizzle/schema";
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

  const { active: participation } = await getActiveParticipation(user.id);

  if (!participation) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-lg font-semibold">Missies</h1>
        <p className="mt-2 text-sm text-muted-foreground">Je doet nog niet mee aan een challenge.</p>
      </div>
    );
  }

  const [allMissions, standings, myBets] = await Promise.all([
    db.query.missions.findMany({
      where: or(isNull(missions.challengeId), eq(missions.challengeId, participation.challengeId)),
      with: { completions: { with: { user: true } } },
    }),
    getWeeklyStandings(participation.challengeId),
    db.query.bets.findMany({
      where: and(eq(bets.challengeId, participation.challengeId), eq(bets.userId, user.id)),
      orderBy: desc(bets.settledAt),
      with: { selections: true },
    }),
  ]);

  const progressContext: MissionProgressContext = {
    bets: myBets,
    currentBalance: participation.balance,
    startingBalance: participation.challenge.startingBalance,
  };

  const now = new Date();
  const visible = allMissions.filter(
    (m) => !m.hidden || m.completions.some((c) => c.userId === user.id)
  );

  // Two kinds of missions (§missies-split): challenge missions belong to this
  // challenge and can pay money from its missiebudget; League of Gamblers
  // missions (challengeId null) are career-wide, once ever, XP-only.
  const challengeMissions = visible.filter((m) => m.challengeId !== null);
  const generalMissions = visible.filter((m) => m.challengeId === null);

  const sections = [
    { key: "week", title: "Deze week", items: challengeMissions.filter((m) => bucketOf(m, now) === "week") },
    { key: "ongoing", title: "Doorlopend", items: challengeMissions.filter((m) => bucketOf(m, now) === "ongoing") },
    { key: "expired", title: "Afgelopen", items: challengeMissions.filter((m) => bucketOf(m, now) === "expired") },
  ].filter((s) => s.items.length > 0);

  const missionCard = (mission: (typeof visible)[number], sectionKey: string) => {
    const myCompletion = mission.completions.find((c) => c.userId === user.id);
    const full = mission.maxWinners !== null && mission.completions.length >= mission.maxWinners;
    const progress =
      myCompletion || sectionKey === "expired" ? null : getMissionProgress(mission, progressContext);

    return (
      <Card key={mission.id} className={sectionKey === "expired" ? "opacity-60" : undefined}>
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
          {sectionKey === "week" && mission.validTo && (
            <CardDescription>Loopt tot {deadlineFormatter.format(mission.validTo)}</CardDescription>
          )}
          {progress && (
            <div className="space-y-1 pt-1">
              <Progress value={(progress.current / progress.target) * 100} />
              <p className="text-xs tabular-nums text-muted-foreground">
                {progress.current} / {progress.target}
              </p>
            </div>
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
              ` · behaald door ${[...new Set(mission.completions.map((c) => c.user.username))].join(", ")}`}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Missies</h1>
        <p className="text-sm text-muted-foreground">{participation.challenge.name}</p>
      </div>

      <WeeklyStandings standings={standings} currentUserId={user.id} />

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold">Challenge-missies</h2>
          <p className="text-xs text-muted-foreground">
            Horen bij {participation.challenge.name} — hier valt geld te winnen.
          </p>
        </div>
        {sections.length === 0 && (
          <p className="text-sm text-muted-foreground">Nog geen missies voor deze challenge.</p>
        )}
        {sections.map((section) => (
          <div key={section.key} className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">{section.title}</h3>
            {section.items.map((mission) => missionCard(mission, section.key))}
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold">
            League of <span className="text-accent-brand">Gamblers</span>-missies
          </h2>
          <p className="text-xs text-muted-foreground">
            Gelden altijd, in elke challenge, en zijn één keer te behalen. Hiermee verzamel je
            XP voor je level.
          </p>
        </div>
        {generalMissions.length === 0 && (
          <p className="text-sm text-muted-foreground">Nog geen LoG-missies.</p>
        )}
        {generalMissions.map((mission) => missionCard(mission, "ongoing"))}
      </section>
    </div>
  );
}
