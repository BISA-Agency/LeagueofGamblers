import type { Market, Outcome } from "@drizzle/schema";
import { dutchOutcomeLabel } from "@/lib/sportsbook/outcome-label";
import { orderOutcomes } from "@/lib/sportsbook/outcome-order";
import { OutcomeButton } from "./outcome-button";

type MarketWithOutcomes = Market & { outcomes: Outcome[] };

/** Section order: the bet most people came for first. */
const GROUP_ORDER: { type: string; title: string }[] = [
  { type: "h2h", title: "Wedstrijduitslag" },
  { type: "double_chance", title: "Dubbele kans" },
  { type: "draw_no_bet", title: "Draw no bet" },
  { type: "btts", title: "Beide teams scoren" },
  { type: "totals", title: "Over/Under" },
  { type: "spreads", title: "Handicap" },
  { type: "team_totals", title: "Team totaal" },
  { type: "correct_score", title: "Correcte score" },
  { type: "custom", title: "Overig" },
];

/**
 * Above this many outcomes a single row squeezes each button to a sliver, so
 * the market wraps into a grid instead. Correct score is the reason — it
 * carries twenty-odd prices where every other market carries two or three.
 */
const GRID_FROM = 5;

function lineLabel(market: MarketWithOutcomes): string | null {
  if (market.line === null) return null;
  if (market.type === "spreads") return `${market.line > 0 ? "+" : ""}${market.line}`;
  return String(market.line);
}

/**
 * Markets grouped by kind rather than listed flat. With alternate lines an
 * event can carry a dozen markets, and three separate blocks each headed
 * "Over/Under" reads as noise — one heading with its lines beneath it is how
 * a bookmaker's page is actually organised.
 */
export function MarketGroups({
  markets,
  eventId,
  eventName,
  eventStart,
  sport,
  competition,
  homeTeam,
  awayTeam,
}: {
  markets: MarketWithOutcomes[];
  eventId: string;
  eventName: string;
  eventStart: string;
  sport: string;
  competition?: string | null;
  homeTeam?: string | null;
  awayTeam?: string | null;
}) {
  const groups = GROUP_ORDER.map((group) => ({
    ...group,
    // Team totals are grouped per team, so the heading can name it.
    items: markets
      .filter((m) => m.type === group.type)
      .sort((a, b) => (a.line ?? 0) - (b.line ?? 0)),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      {groups.map((group) => {
        // One sub-heading per team when a group is split by team.
        const byTeam = new Map<string, MarketWithOutcomes[]>();
        for (const m of group.items) {
          const key = m.team ?? "";
          byTeam.set(key, [...(byTeam.get(key) ?? []), m]);
        }

        return (
          <section key={group.type} className="space-y-2">
            {[...byTeam.entries()].map(([team, items]) => (
              <div key={team || group.type} className="space-y-1.5">
                <h2 className="text-sm font-medium">
                  {team ? `${group.title} · ${team}` : group.title}
                </h2>
                {items.map((market) => {
                  // Double chance labels ("Chelsea of Gelijkspel") are far too
                  // long to sit beside a price on a phone.
                  const stacked = market.outcomes.some(
                    (o) => dutchOutcomeLabel(o.label).length > 12
                  );
                  const asGrid = market.outcomes.length >= GRID_FROM;
                  return (
                  <div key={market.id} className="flex items-center gap-2">
                    {lineLabel(market) && (
                      <span className="w-12 shrink-0 text-xs tabular-nums text-muted-foreground">
                        {lineLabel(market)}
                      </span>
                    )}
                    <div
                      className={
                        asGrid
                          ? "grid min-w-0 flex-1 grid-cols-3 gap-1.5 sm:grid-cols-4"
                          : "flex min-w-0 flex-1 items-stretch gap-1.5"
                      }
                    >
                      {orderOutcomes(market, market.outcomes, { homeTeam, awayTeam }).map((outcome) => (
                        <OutcomeButton
                          key={outcome.id}
                          outcomeId={outcome.id}
                          label={outcome.label}
                          displayLabel={dutchOutcomeLabel(outcome.label)}
                          odds={outcome.odds}
                          eventId={eventId}
                          eventName={eventName}
                          eventStart={eventStart}
                          sport={sport}
                          competition={competition}
                          marketLabel={market.label}
                          stacked={stacked}
                        />
                      ))}
                    </div>
                  </div>
                  );
                })}
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
