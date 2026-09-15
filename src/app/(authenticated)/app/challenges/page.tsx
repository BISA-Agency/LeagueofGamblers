import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
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
import { getChallengeStats } from "@/lib/challenges/stats";
import type { PrizeTierRow } from "@/lib/settlement/payouts";
import { createClient } from "@/lib/supabase/server";
import { LobbyFilters } from "./lobby-filters";
import { LobbyTable, type LobbyRow } from "./lobby-table";

export const metadata: Metadata = { title: "Challenges" };

const DAY_MS = 86_400_000;

const TIMING_HEADER: Record<LobbyStatus, string> = {
  open: "Start",
  live: "Status",
  finished: "Status",
};

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

  const [allChallenges, myParticipations, prizeTiers] = await Promise.all([
    db.query.challenges.findMany({
      where: (c, { ne }) => ne(c.status, "draft"),
      orderBy: (c, { desc }) => desc(c.startAt),
      with: { participants: true },
    }),
    user
      ? db.query.challengeParticipants.findMany({
          where: (p, { eq }) => eq(p.userId, user.id),
        })
      : Promise.resolve([]),
    db.query.prizeTiers.findMany(),
  ]);

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
    rows.push({
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
      joined: joinedIds.has(challenge.id),
      isHot: hotFlags.get(challenge.id) ?? false,
      canJoin,
      lateJoinDeadline:
        challenge.status === "live" && challenge.lateJoinDays > 0
          ? new Date(challenge.startAt.getTime() + challenge.lateJoinDays * DAY_MS)
          : null,
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

      <LobbyTable
        rows={visible}
        timingHeader={TIMING_HEADER[filters.status]}
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
