import type { Market, Outcome } from "@drizzle/schema";
import { OutcomeButton } from "./outcome-button";

export function MarketSection({
  market,
  eventId,
  eventName,
  eventStart,
  sport,
  competition,
}: {
  market: Market & { outcomes: Outcome[] };
  eventId: string;
  eventName: string;
  eventStart: string;
  sport: string;
  competition?: string | null;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] text-muted-foreground">
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
            eventId={eventId}
            eventName={eventName}
            eventStart={eventStart}
            sport={sport}
            competition={competition}
            marketLabel={market.label}
          />
        ))}
      </div>
    </div>
  );
}
