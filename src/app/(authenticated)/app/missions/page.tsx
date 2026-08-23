import { and, desc, eq, isNull, ne, or } from "drizzle-orm";
import type { Metadata } from "next";
import { MissionChainCard } from "@/components/missions/mission-chain-card";
import { MissionSummary } from "@/components/missions/mission-summary";
import { WeeklyStandings } from "@/components/missions/weekly-standings";
import { db } from "@/lib/db";
import { getActiveParticipation } from "@/lib/challenges/active";
import { getWeeklyStandings } from "@/lib/challenges/week";
import { buildChains, type ChainRung } from "@/lib/missions/chains";
import { getMissionProgress, type MissionProgressContext } from "@/lib/missions/progress";
import { countConfirmedReferrals } from "@/lib/referrals/assign";
import { betSelections, bets, challengeParticipants, missions, type Mission } from "@drizzle/schema";
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

  // Career totals for the chain bars. Counted in the database rather than by
  // loading a lifetime of bets: these run to 2000.
  const [settledBets, wonBets, sportRows, played, referralsConfirmed] = await Promise.all([
    db.$count(bets, and(eq(bets.userId, user.id), ne(bets.status, "open"))),
    db.$count(
      bets,
      and(eq(bets.userId, user.id), or(eq(bets.status, "won"), eq(bets.status, "half_won")))
    ),
    db
      .selectDistinct({ sport: betSelections.sport })
      .from(betSelections)
      .innerJoin(bets, eq(bets.id, betSelections.betId))
      .where(
        and(eq(bets.userId, user.id), or(eq(bets.status, "won"), eq(bets.status, "half_won")))
      ),
    db.query.challengeParticipants.findMany({
      where: eq(challengeParticipants.userId, user.id),
      with: { challenge: { columns: { status: true } } },
    }),
    countConfirmedReferrals(user.id),
  ]);

  const progressContext: MissionProgressContext = {
    bets: myBets,
    currentBalance: participation.balance,
    startingBalance: participation.challenge.startingBalance,
    career: {
      settledBets,
      wonBets,
      sportsWon: sportRows.filter((r) => r.sport).length,
      challengesFinished: played.filter((p) => p.challenge.status === "finished").length,
      referralsConfirmed,
    },
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

  const rungs = (rows: Row[]): ChainRung<Row>[] =>
    rows.map((mission) => {
      const s = state(mission);
      return {
        mission,
        completed: s.completed,
        progress: s.completed || s.expired ? null : getMissionProgress(mission, progressContext),
      };
    });

  const challengeChains = buildChains(rungs(visible.filter((m) => m.challengeId !== null)));
  const generalChains = buildChains(rungs(visible.filter((m) => m.challengeId === null)));

  const completedCount = visible.filter((m) => state(m).completed).length;
  const openCash = visible
    .filter((m) => {
      const s = state(m);
      return m.challengeId !== null && !s.completed && !s.expired && !s.full;
    })
    .reduce((sum, m) => sum + (m.rewardAmount ?? 0), 0);

  const renderChain = (chain: ReturnType<typeof buildChains<Row>>[number]) => {
    const mission = chain.active.mission;
    const s = state(mission);
    const spotsLeft =
      mission.maxWinners !== null ? mission.maxWinners - mission.completions.length : null;

    return (
      <MissionChainCard
        key={chain.key}
        title={mission.title}
        description={mission.description}
        rewardXp={mission.rewardXp}
        rewardAmount={mission.rewardAmount}
        total={chain.total}
        done={chain.doneCount}
        allDone={chain.allDone}
        progress={chain.active.progress}
        single={chain.total === 1}
        note={
          s.expired
            ? "Verlopen"
            : spotsLeft !== null && spotsLeft <= 0
              ? "Vol"
              : spotsLeft !== null && !chain.allDone
                ? `Nog ${spotsLeft} ${spotsLeft === 1 ? "plek" : "plekken"}`
                : mission.validTo && !chain.allDone
                  ? `Loopt tot ${deadlineFormatter.format(mission.validTo)}`
                  : undefined
        }
      />
    );
  };

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
        {challengeChains.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nog geen missies voor deze challenge.
          </p>
        ) : (
          <div className="space-y-2">{challengeChains.map(renderChain)}</div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold">
            League of <span className="text-accent-brand">Gamblers</span>-missies
          </h2>
          <p className="text-xs text-muted-foreground">
            Reeksen die in elke challenge doorlopen. Elke reeks telt door zolang je speelt.
          </p>
        </div>
        {generalChains.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nog geen LoG-missies.
          </p>
        ) : (
          <div className="space-y-2">{generalChains.map(renderChain)}</div>
        )}
      </section>
    </div>
  );
}
