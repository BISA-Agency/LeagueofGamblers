import { Trophy } from "lucide-react";
import Link from "next/link";
import { formatEventTime } from "@/lib/format-event-time";
import type { Event, Market, Outcome } from "@drizzle/schema";
import { MarketSection } from "./market-section";
import { TeamBadge } from "./team-badge";

export type EventWithOdds = Event & { markets: (Market & { outcomes: Outcome[] })[] };

const MARKET_PRIORITY = ["h2h", "totals", "spreads", "custom"];

function primaryMarket(markets: EventWithOdds["markets"]) {
  return [...markets].sort(
    (a, b) => MARKET_PRIORITY.indexOf(a.type) - MARKET_PRIORITY.indexOf(b.type)
  )[0];
}

export function EventCard({ event }: { event: EventWithOdds }) {
  const market = primaryMarket(event.markets);
  const extraMarkets = event.markets.length - (market ? 1 : 0);

  return (
    <Link
      href={`/app/sportsbook/${event.id}`}
      className="block rounded-lg border border-border bg-card p-3 transition-colors hover:border-accent-brand/40"
    >
      <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="flex min-w-0 items-center gap-1.5 truncate">
          <Trophy className="size-3.5 shrink-0" />
          <span className="truncate">{event.competition ?? event.sportLabel}</span>
        </span>
        <span className="shrink-0 tabular-nums">{formatEventTime(event.startsAt)}</span>
      </div>

      <div className="mb-3 space-y-1.5">
        {event.homeTeam && event.awayTeam ? (
          <>
            <div className="flex items-center gap-2 text-sm font-medium">
              <TeamBadge name={event.homeTeam} />
              <span className="truncate">{event.homeTeam}</span>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium">
              <TeamBadge name={event.awayTeam} />
              <span className="truncate">{event.awayTeam}</span>
            </div>
          </>
        ) : (
          <p className="text-sm font-medium">{event.name}</p>
        )}
      </div>

      {market && (
        <MarketSection
          market={market}
          eventId={event.id}
          eventName={event.name}
          eventStart={event.startsAt.toISOString()}
          sport={event.sportLabel}
          competition={event.competition}
        />
      )}

      {extraMarkets > 0 && (
        <p className="mt-2 text-[11px] text-accent-brand">
          +{extraMarkets} markt{extraMarkets !== 1 ? "en" : ""} — bekijk alle opties
        </p>
      )}
    </Link>
  );
}
