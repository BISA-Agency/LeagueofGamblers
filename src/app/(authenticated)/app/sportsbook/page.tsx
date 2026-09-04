import { and, asc, eq, gt } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { ReceiptText } from "lucide-react";
import { EventList } from "@/components/sportsbook/event-list";
import { SportsbookNav } from "@/components/sportsbook/sportsbook-nav";
import { getActiveParticipation } from "@/lib/challenges/active";
import { buildNav, filterEvents, filterHref, resolveFilter } from "@/lib/sportsbook/categories";
import { db } from "@/lib/db";
import { bets, events, markets } from "@drizzle/schema";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Sportsbook" };

export default async function SportsbookPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string; l?: string; soon?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { active: participation } = await getActiveParticipation(user.id);

  if (!participation) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-lg font-semibold">Sportsbook</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Je doet nog niet mee aan een challenge. Ga naar Challenges om je aan te melden.
        </p>
      </div>
    );
  }

  /**
   * Before kick-off the sportsbook is readable but not playable. It used to be
   * a closed door, which meant the weeks of build-up to a challenge had nothing
   * to look at — the odds are half the anticipation. Staking is blocked in the
   * bet slip and refused server-side either way.
   */
  const open = participation.status === "active";

  /**
   * Kick-off, not status, is what closes a fixture for betting.
   *
   * An event stays "upcoming" until its result lands, which is a couple of
   * hours after the whistle — so filtering on status alone left matches that
   * were already being played sitting in the list at full price. Nothing could
   * come of tapping one: placeSportsbookBet refuses a started event. It was
   * simply a dead end wearing a price tag.
   */
  const upcomingEvents = await db.query.events.findMany({
    where: and(
      eq(events.challengeId, participation.challengeId),
      eq(events.status, "upcoming"),
      gt(events.startsAt, new Date())
    ),
    orderBy: asc(events.startsAt),
    // A suspended market must not be offered — placing on it fails server-side
    // anyway, so showing a clickable price would only produce a dead end.
    with: {
      markets: { where: eq(markets.status, "open"), with: { outcomes: true } },
    },
  });

  // Filtering happens in memory: a challenge's fixture list is a page or two
  // at most, and this keeps the rail's counts and the list from disagreeing.
  const filter = resolveFilter(upcomingEvents, await searchParams);
  const { sports, leagues, soonCount } = buildNav(upcomingEvents, filter);
  const visible = filterEvents(upcomingEvents, filter);

  const openBets = await db.$count(
    bets,
    and(
      eq(bets.challengeId, participation.challengeId),
      eq(bets.userId, user.id),
      eq(bets.status, "open")
    )
  );

  return (
    <div className="px-4 py-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight">Sportsbook</h1>
          <p className="truncate text-sm text-muted-foreground">{participation.challenge.name}</p>
        </div>
        {/* Always reachable, and the count is the reason to look: it is the
            only place in the sportsbook that says a bet is still running. */}
        <Link
          href="/app/bets"
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium transition-colors hover:border-foreground/25 hover:bg-secondary/60"
        >
          <ReceiptText className="size-3.5 text-muted-foreground" />
          Mijn bets
          {openBets > 0 && (
            <span className="rounded-full bg-accent-brand px-1.5 text-[10px] font-semibold tabular-nums text-background">
              {openBets}
            </span>
          )}
        </Link>
      </div>

      {!open && (
        <p className="mb-4 rounded-lg border border-accent-brand/30 bg-accent-brand/5 px-3.5 py-2.5 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Kijken mag, wedden nog niet.</span>{" "}
          {participation.challenge.name} is nog niet begonnen — zodra de challenge start, kun je
          hier inzetten.
        </p>
      )}

      {upcomingEvents.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nog geen wedstrijden geïmporteerd voor deze challenge.
        </p>
      ) : (
        <>
          <SportsbookNav
            sports={sports}
            leagues={leagues}
            filter={filter}
            soonCount={soonCount}
          />
          <div className="pt-5">
            {visible.length === 0 ? (
              <div className="rounded-xl border border-border bg-card/50 px-4 py-10 text-center">
                <p className="text-sm text-muted-foreground">
                  Geen wedstrijden binnen deze filters.
                </p>
                <Link
                  href={filterHref({})}
                  className="mt-2 inline-block text-xs font-medium text-accent-brand hover:underline"
                >
                  Toon alles
                </Link>
              </div>
            ) : (
              <EventList events={visible} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
