import { eq } from "drizzle-orm";
import { ArrowLeft, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MarketGroups } from "@/components/sportsbook/market-groups";
import { TeamBadge } from "@/components/sportsbook/team-badge";
import { db } from "@/lib/db";
import { formatEventTime } from "@/lib/format-event-time";
import { events, markets } from "@drizzle/schema";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Wedstrijd" };

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
    with: {
      markets: { where: eq(markets.status, "open"), with: { outcomes: true } },
    },
  });
  if (!event) notFound();

  if (event.challengeId) {
    const participation = await db.query.challengeParticipants.findFirst({
      where: (p, { and: andOp, eq: eqOp }) =>
        andOp(eqOp(p.userId, user.id), eqOp(p.challengeId, event.challengeId!)),
    });
    if (!participation) notFound();
  }

  return (
    <div className="px-4 py-6">
      <Link
        href="/app/sportsbook"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Sportsbook
      </Link>

      <div className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Trophy className="size-3.5" />
        <span>{event.competition ?? event.sportLabel}</span>
        <span className="tabular-nums">· {formatEventTime(event.startsAt)}</span>
      </div>

      {event.homeTeam && event.awayTeam ? (
        <div className="mb-6 space-y-2.5">
          <div className="flex items-center gap-2.5 text-lg font-semibold">
            <TeamBadge name={event.homeTeam} size={28} />
            {event.homeTeam}
          </div>
          <div className="flex items-center gap-2.5 text-lg font-semibold">
            <TeamBadge name={event.awayTeam} size={28} />
            {event.awayTeam}
          </div>
        </div>
      ) : (
        <h1 className="mb-6 text-lg font-semibold">{event.name}</h1>
      )}

      {event.markets.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nog geen markten voor deze wedstrijd.</p>
      ) : (
        <MarketGroups
          markets={event.markets}
          eventId={event.id}
          eventName={event.name}
          eventStart={event.startsAt.toISOString()}
          sport={event.sportLabel}
          competition={event.competition}
        />
      )}
    </div>
  );
}
