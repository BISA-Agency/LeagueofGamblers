import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { isNotNull } from "drizzle-orm";
import { events } from "@drizzle/schema";
import { canJoinChallenge } from "@/lib/challenges/eligibility";
import { isHotChallenge } from "@/lib/challenges/hot";
import {
  defaultLobbyStatus,
  lobbyHref,
  lobbyStatusOf,
  matchesLobbyFacets,
  parseLobbyFilters,
  type LobbyStatus,
} from "@/lib/challenges/lobby-filters";
import { displayBalance, getChallengeStats, hasStarted } from "@/lib/challenges/stats";
import { DEFAULT_SPORT_KEYS, DEFAULT_SPORT_LABELS } from "@/lib/odds-provider/sports";
import { calculatePrizeSplit, resolvePrizeTiers, type PrizeTierRow } from "@/lib/settlement/payouts";
import { createClient } from "@/lib/supabase/server";
import { type LobbyDetail } from "./lobby-detail";
import { LobbyFilters } from "./lobby-filters";
import { LobbyCards, type LobbyRow } from "./lobby-cards";

export const metadata: Metadata = { title: "Challenges" };

const DAY_MS = 86_400_000;

/** Whole days from now until a moment, never negative — "start over 3 dagen", "nog 1 dag". */
const daysBetween = (from: Date, to: Date) =>
  Math.max(0, Math.ceil((to.getTime() - from.getTime()) / DAY_MS));

// challenges.sportKeys holds the provider's keys ("soccer_epl"). The
// competition name comes from the events we've imported under that key,
// falling back to the static list; a key we've never seen is shown as-is
// rather than guessed.
const STATIC_SPORT_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(DEFAULT_SPORT_KEYS).map(([ours, api]) => [api, DEFAULT_SPORT_LABELS[ours] ?? ours])
);

async function competitionLabelMap(): Promise<Map<string, string>> {
  const rows = await db
    .selectDistinct({ key: events.sportKey, competition: events.competition })
    .from(events)
    .where(isNotNull(events.competition));
  const map = new Map(Object.entries(STATIC_SPORT_LABELS));
  for (const row of rows) if (row.competition) map.set(row.key, row.competition);
  return map;
}

const EMPTY_TAB: Record<LobbyStatus, string> = {
  open: "Er staat nu niets open voor inschrijving.",
  live: "Er loopt op dit moment geen challenge.",
  finished: "Nog geen afgelopen challenges.",
};

export default async function ChallengesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; feat?: string }>;
}) {
  const [params, supabase] = await Promise.all([searchParams, createClient()]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [allChallenges, myParticipations, prizeTiers, sportLabels] = await Promise.all([
    db.query.challenges.findMany({
      where: (c, { ne }) => ne(c.status, "draft"),
      orderBy: (c, { desc }) => desc(c.startAt),
      with: { participants: { with: { user: { columns: { username: true, avatarUrl: true } } } } },
    }),
    user
      ? db.query.challengeParticipants.findMany({
          where: (p, { eq }) => eq(p.userId, user.id),
        })
      : Promise.resolve([]),
    db.query.prizeTiers.findMany(),
    competitionLabelMap(),
  ]);

  const now = new Date();
  const joinedIds = new Set(myParticipations.map((p) => p.challengeId));
  const hotFlags = new Map(
    await Promise.all(
      allChallenges
        .filter((c) => c.status === "live")
        .map(async (c) => [c.id, await isHotChallenge(c.id)] as const)
    )
  );

  const rows: (LobbyRow & { tab: LobbyStatus })[] = [];
  for (const challenge of allChallenges) {
    const tab = lobbyStatusOf(challenge.status);
    if (!tab) continue;
    const stats = getChallengeStats(challenge, challenge.participants, prizeTiers as PrizeTierRow[]);
    const canJoin = canJoinChallenge(challenge);
    const joined = joinedIds.has(challenge.id);
    const started = hasStarted(challenge.status);

    // Before the first buy-in lands, project the split on what everyone who
    // joined would pay — otherwise the pane shows nothing to play for.
    const splitIsProjected = stats.paidCount === 0 && stats.joinedCount > 0;
    const splitBase = splitIsProjected ? stats.potentialPot : stats.pot;
    const rawSplit = splitIsProjected
      ? calculatePrizeSplit(
          stats.joinedCount,
          stats.potentialPot,
          resolvePrizeTiers(challenge, prizeTiers as PrizeTierRow[])
        )
      : stats.split;

    // Standings once it runs (final rank is the authority after the finish);
    // sign-up order before that.
    const ordered = [...challenge.participants].sort((a, b) => {
      if (!started) return a.joinedAt.getTime() - b.joinedAt.getTime();
      if (a.finalRank !== null && b.finalRank !== null) return a.finalRank - b.finalRank;
      return displayBalance(b, challenge) - displayBalance(a, challenge);
    });

    const detail: LobbyDetail = {
      slug: challenge.slug,
      joined,
      started,
      descriptionMd: challenge.descriptionMd,
      prizes: {
        pot: stats.pot,
        potentialPot: stats.potentialPot,
        unpaidCount: stats.unpaidCount,
        split: rawSplit
          .filter((e) => e.amount > 0)
          .map((e) => ({ ...e, percent: splitBase > 0 ? Math.round((e.amount / splitBase) * 100) : 0 })),
        splitIsProjected,
        hardcore: challenge.prizeMode === "hardcore",
        bountyPerPlayer: challenge.bountyEnabled ? challenge.bountyPerPlayer : null,
      },
      players: ordered.map((p, i) => ({
        username: p.user.username,
        avatarUrl: p.user.avatarUrl,
        balance: started ? displayBalance(p, challenge) : null,
        rank: started ? i + 1 : null,
        paid: p.paidBuyIn,
        bust: p.status === "bust",
        isMe: user?.id === p.userId,
      })),
      structure: {
        startingBalance: challenge.startingBalance,
        buyIn: challenge.buyInAmount,
        feePercent: challenge.platformFeePercent,
        sports: challenge.sportKeys.map((key) => sportLabels.get(key) ?? key),
        allowRebuy: challenge.allowRebuy,
        lateJoinDays: challenge.lateJoinDays,
        missionBudget: challenge.missionBudget,
        missionsFromPot: challenge.missionsFromPot,
        startAt: challenge.startAt,
        endAt: challenge.endAt,
      },
    };

    rows.push({
      detail,
      tab,
      id: challenge.id,
      slug: challenge.slug,
      name: challenge.name,
      status: challenge.status,
      durationType: challenge.durationType,
      prizeMode: challenge.prizeMode,
      allowRebuy: challenge.allowRebuy,
      bountyEnabled: challenge.bountyEnabled,
      startAt: challenge.startAt,
      endAt: challenge.endAt,
      buyIn: challenge.buyInAmount,
      pot: stats.pot,
      joinedCount: stats.joinedCount,
      maxPlayers: stats.maxPlayers,
      seatsNearlyFull:
        stats.joinedCount > 0 &&
        stats.maxPlayers !== null &&
        stats.joinedCount >= stats.maxPlayers - 2 &&
        stats.joinedCount < stats.maxPlayers,
      joined,
      isHot: hotFlags.get(challenge.id) ?? false,
      canJoin,
      lateJoinDeadline:
        challenge.status === "live" && challenge.lateJoinDays > 0
          ? new Date(challenge.startAt.getTime() + challenge.lateJoinDays * DAY_MS)
          : null,
      daysUntilStart: daysBetween(now, challenge.startAt),
      daysLeft: daysBetween(now, challenge.endAt),
    });
  }

  // Facets narrow every tab; the tab counts tell you what's left in each.
  const parsed = parseLobbyFilters(params);
  const faceted = rows.filter((r) => matchesLobbyFacets(r, parsed));
  const counts: Record<LobbyStatus, number> = { open: 0, live: 0, finished: 0 };
  for (const r of faceted) counts[r.tab] += 1;

  const filters = {
    ...parsed,
    status: parsed.status ?? defaultLobbyStatus(counts),
  };
  const visible = faceted.filter((r) => r.tab === filters.status);
  const hasFacets = filters.types.length > 0 || filters.features.length > 0;

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Challenges</h1>
        <p className="text-sm text-muted-foreground">Kies een tafel en schuif aan.</p>
      </div>

      <LobbyFilters filters={filters} counts={counts} />

      <LobbyCards
        rows={visible}
        emptyMessage={
          hasFacets ? (
            <>
              Geen challenges met deze filters.{" "}
              <Link
                href={lobbyHref(filters, { clearFacets: true })}
                scroll={false}
                className="text-foreground underline underline-offset-2"
              >
                Wis filters
              </Link>
            </>
          ) : (
            EMPTY_TAB[filters.status]
          )
        }
      />
    </div>
  );
}
