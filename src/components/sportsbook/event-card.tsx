import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { Event, Market, Outcome } from "@drizzle/schema";
import { OutcomeButton } from "./outcome-button";

const timeFormatter = new Intl.DateTimeFormat("nl-NL", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Amsterdam",
});

export type EventWithOdds = Event & { markets: (Market & { outcomes: Outcome[] })[] };

export function EventCard({ event }: { event: EventWithOdds }) {
  return (
    <Card>
      <CardHeader className="gap-1">
        <p className="text-sm font-medium">{event.name}</p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {event.competition ?? event.sportLabel} · {timeFormatter.format(event.startsAt)}
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {event.markets.map((market) => (
          <div key={market.id} className="space-y-1.5">
            <p className="text-xs text-muted-foreground">
              {market.label}
              {market.line !== null && ` (${market.line})`}
            </p>
            <div className="flex gap-2">
              {market.outcomes.map((outcome) => (
                <OutcomeButton
                  key={outcome.id}
                  outcomeId={outcome.id}
                  label={outcome.label}
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
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
