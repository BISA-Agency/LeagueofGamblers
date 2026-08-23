import { and, desc, eq, isNull, or } from "drizzle-orm";
import type { Metadata } from "next";
import { MissionCard } from "@/components/missions/mission-card";
import { MissionSummary } from "@/components/missions/mission-summary";
import { WeeklyStandings } from "@/components/missions/weekly-standings";
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

  type Row = (typeof visible)[number];

  const state = (mission: Row) => {
    const completed = mission.completions.some((c) => c.userId === user.id);
    const bucket = bucketOf(mission, now);
    return {
      completed,
      bucket,
      full: mission.maxWinners !== null && mission.completions.length >= mission.maxWinners,
      expired: bucket === "expired",
    };
  };

  // Actionable first, then completed, then whatever's out of reach.
  const byPriority = (a: Row, b: Row) => {
    const sa = state(a);
    const sb = state(b);
    const rank = (s: ReturnType<typeof state>) => (s.completed ? 1 : s.expired || s.full ? 2 : 0);
    return rank(sa) - rank(sb);
  };

  const card = (mission: Row) => {
    const s = state(mission);
    return (
      <MissionCard
        key={mission.id}
        title={mission.title}
        description={mission.description}
        rewardAmount={mission.rewardAmount}
        rewardXp={mission.rewardXp}
        hasBadge={Boolean(mission.rewardBadgeId)}
        completed={s.completed}
        full={s.full}
        expired={s.expired}
        deadline={
          s.bucket === "week" && mission.validTo
            ? `Loopt tot ${deadlineFormatter.format(mission.validTo)}`
            : undefined
        }
        progress={
          s.completed || s.expired ? null : getMissionProgress(mission, progressContext)
        }
        winners={[
          ...new Set(
            mission.completions
              // Your own card already says "Behaald"; repeating your name
              // under it is noise.
              .filter((c) => c.userId !== user.id)
              .map((c) => c.user.username)
          ),
        ]}
      />
    );
  };

  const challengeMissions = visible.filter((m) => m.challengeId !== null).sort(byPriority);
  const generalMissions = visible.filter((m) => m.challengeId === null).sort(byPriority);

  const completedCount = visible.filter((m) => state(m).completed).length;
  const openCash = challengeMissions
    .filter((m) => {
      const s = state(m);
      return !s.completed && !s.expired && !s.full;
    })
    .reduce((sum, m) => sum + (m.rewardAmount ?? 0), 0);

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Missies</h1>
        <p className="text-sm text-muted-foreground">
          Opdrachten naast de hoofdprijs — voor geld, XP en badges.
        </p>
      </div>

      <MissionSummary openCash={openCash} completed={completedCount} total={visible.length} />

      <WeeklyStandings standings={standings} currentUserId={user.id} />

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold">Challenge-missies</h2>
          <p className="text-xs text-muted-foreground">
            Horen bij {participation.challenge.name}. Hier valt geld te winnen.
          </p>
        </div>
        {challengeMissions.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nog geen missies voor deze challenge.
          </p>
        ) : (
          <div className="space-y-2">{challengeMissions.map(card)}</div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold">
            League of <span className="text-accent-brand">Gamblers</span>-missies
          </h2>
          <p className="text-xs text-muted-foreground">
            Gelden in elke challenge en zijn één keer te behalen. Hiermee klim je in level.
          </p>
        </div>
        {generalMissions.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nog geen LoG-missies.
          </p>
        ) : (
          <div className="space-y-2">{generalMissions.map(card)}</div>
        )}
      </section>
    </div>
  );
}
