import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { formatEventDayTime } from "@/lib/format-event-time";
import { orderOutcomes } from "@/lib/sportsbook/outcome-order";
import { pickPrimaryMarket } from "@/lib/sportsbook/primary-market";
import type { Event, Market, Outcome } from "@drizzle/schema";
import { OutcomeButton } from "./outcome-button";
import { TeamBadge } from "./team-badge";

export type EventWithOdds = Event & { markets: (Market & { outcomes: Outcome[] })[] };

/**
 * 1 / X / 2 on the card, because the teams are already named directly above
 * it. The underlying label is untouched — settlement matches on it.
 */
function shortLabel(
  market: Market,
  outcome: Outcome,
  event: Pick<Event, "homeTeam" | "awayTeam">
): string | undefined {
  if (market.type !== "h2h" || !event.homeTeam || !event.awayTeam) return undefined;
  if (outcome.label === event.homeTeam) return "1";
  if (outcome.label === event.awayTeam) return "2";
  return "X";
}

export function EventCard({ event }: { event: EventWithOdds }) {
  const market = pickPrimaryMarket(event.markets);
  const extraMarkets = event.markets.length - (market ? 1 : 0);
  const { day, time } = formatEventDayTime(event.startsAt);
  const hasTeams = Boolean(event.homeTeam && event.awayTeam);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card">
      {/* Only the fixture block navigates. The odds are buttons, and nesting
          buttons inside a link makes both of them worse. */}
      <Link
        href={`/app/sportsbook/${event.id}`}
        className="block flex-1 px-3 pb-3 pt-2.5 transition-colors hover:bg-secondary/30"
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            {hasTeams ? (
              <>
                <TeamLine name={event.homeTeam!} />
                <TeamLine name={event.awayTeam!} />
              </>
            ) : (
              <p className="text-sm font-medium">{event.name}</p>
            )}
          </div>
          {/* Two lines on the right to mirror the two team lines on the left. */}
          <div className="shrink-0 text-right text-xs tabular-nums leading-[1.4]">
            <p className="text-muted-foreground">{day}</p>
            <p className="font-medium">{time}</p>
          </div>
        </div>
      </Link>

      {market && (
        <div className="flex gap-1.5 px-3 pb-3">
          {orderOutcomes(market, market.outcomes, event).map((outcome) => (
            <OutcomeButton
              key={outcome.id}
              outcomeId={outcome.id}
              label={outcome.label}
              displayLabel={shortLabel(market, outcome, event)}
              odds={outcome.odds}
              eventId={event.id}
              eventName={event.name}
              eventStart={event.startsAt.toISOString()}
              sport={event.sportLabel}
              competition={event.competition}
              marketLabel={market.label}
            />
          ))}
        </div>
      )}

      <Link
        href={`/app/sportsbook/${event.id}`}
        className="flex items-center justify-center gap-1 border-t border-border py-2 text-[11px] text-muted-foreground transition-colors hover:bg-secondary/40 hover:text-foreground"
      >
        {extraMarkets > 0
          ? `+${extraMarkets} ${extraMarkets === 1 ? "markt" : "markten"}`
          : "Bekijk wedstrijd"}
        <ChevronRight className="size-3.5" />
      </Link>
    </article>
  );
}

function TeamLine({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2">
      <TeamBadge name={name} size={20} />
      <span className="truncate text-sm font-medium">{name}</span>
    </div>
  );
}
