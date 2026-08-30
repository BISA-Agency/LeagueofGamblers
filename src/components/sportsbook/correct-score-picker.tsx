"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Market, Outcome } from "@drizzle/schema";
import { useBetSlip } from "@/lib/betslip/context";
import { orderOutcomes } from "@/lib/sportsbook/outcome-order";
import { buildScoreGrid } from "@/lib/sportsbook/score-grid";
import { cn } from "@/lib/utils";
import { OutcomeButton } from "./outcome-button";
import { TeamBadge } from "./team-badge";

type MarketWithOutcomes = Market & { outcomes: Outcome[] };

/** One team's row of goal tallies. */
function TallyRow({
  team,
  tallies,
  available,
  value,
  onPick,
}: {
  team: string;
  tallies: number[];
  available: (n: number) => boolean;
  value: number | null;
  onPick: (n: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-xs font-medium">
        <TeamBadge name={team} size={18} />
        <span className="truncate">{team}</span>
      </div>
      <div className="flex flex-wrap gap-1.5 rounded-md border border-border bg-secondary/30 p-1.5">
        {tallies.map((n) => {
          const usable = available(n);
          const picked = value === n;
          return (
            <button
              key={n}
              type="button"
              disabled={!usable}
              onClick={() => onPick(n)}
              aria-pressed={picked}
              aria-label={`${team} ${n}`}
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums transition-colors",
                picked
                  ? "bg-accent-brand text-accent-brand-foreground"
                  : usable
                    ? "text-foreground hover:bg-secondary"
                    : "text-muted-foreground/35"
              )}
            >
              {/* A tally the bookmaker never priced reads as a gap, so the two
                  rows stay aligned and countable. */}
              {usable ? n : "–"}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Correct score, picked a tally at a time.
 *
 * The market carries forty-odd exact scores. As a grid of buttons that is a
 * wall nobody reads; as two rows of goal counts it is the way a betting shop
 * has always shown it — choose how many each side scores, and the price for
 * that scoreline appears underneath.
 *
 * The full list stays one tap away, because scanning for the longest price is
 * a real thing people do.
 */
export function CorrectScorePicker({
  market,
  eventId,
  eventName,
  eventStart,
  sport,
  competition,
  homeTeam,
  awayTeam,
  bettable = true,
}: {
  market: MarketWithOutcomes;
  eventId: string;
  eventName: string;
  eventStart: string;
  sport: string;
  competition?: string | null;
  homeTeam: string;
  awayTeam: string;
  bettable?: boolean;
}) {
  const [home, setHome] = useState<number | null>(null);
  const [away, setAway] = useState<number | null>(null);
  const [showList, setShowList] = useState(false);

  const { addSelection, isSelected, canBet } = useBetSlip();
  const live = canBet && bettable;

  const grid = buildScoreGrid(
    market.outcomes.map((o) => o.label),
    home,
    away
  );

  const picked = grid.label ? market.outcomes.find((o) => o.label === grid.label) : undefined;
  const selected = picked ? isSelected(picked.id) : false;

  /** Tapping the same tally again clears it, which is how you go back a step. */
  const toggle = (current: number | null, next: number) => (current === next ? null : next);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <TallyRow
          team={homeTeam}
          tallies={grid.home}
          available={grid.homeAvailable}
          value={home}
          onPick={(n) => setHome((c) => toggle(c, n))}
        />
        <TallyRow
          team={awayTeam}
          tallies={grid.away}
          available={grid.awayAvailable}
          value={away}
          onPick={(n) => setAway((c) => toggle(c, n))}
        />
      </div>

      {/* The price for the chosen scoreline. */}
      {picked ? (
        <button
          type="button"
          disabled={!live}
          onClick={() =>
            addSelection({
              outcomeId: picked.id,
              eventId,
              eventName,
              eventStart,
              sport,
              competition: competition ?? undefined,
              marketLabel: market.label,
              selectionLabel: picked.label,
              odds: picked.odds,
            })
          }
          aria-pressed={selected}
          className={cn(
            "flex min-h-12 w-full items-center justify-between rounded-md border px-3.5 py-2.5 text-left transition-colors",
            selected
              ? "border-accent-brand bg-accent-brand text-accent-brand-foreground"
              : "border-accent-brand/45 bg-accent-brand/10",
            live && !selected && "hover:bg-accent-brand/20",
            !live && "cursor-default opacity-70"
          )}
        >
          <span className="text-base font-semibold tabular-nums">{picked.label}</span>
          <span
            className={cn(
              "text-lg font-bold tabular-nums",
              selected ? "" : "text-accent-brand"
            )}
          >
            {picked.odds.toFixed(2)}
          </span>
        </button>
      ) : (
        <p className="flex min-h-12 items-center justify-center rounded-md border border-dashed border-border px-3.5 text-xs text-muted-foreground">
          {home === null && away === null
            ? "Kies hoeveel elk team scoort."
            : "Deze uitslag wordt niet aangeboden."}
        </p>
      )}

      <button
        type="button"
        onClick={() => setShowList((s) => !s)}
        className="mx-auto flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        {showList ? "Lijst verbergen" : "Alle uitslagen"}
        <ChevronDown className={cn("size-3.5 transition-transform", showList && "rotate-180")} />
      </button>

      {showList && (
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
          {orderOutcomes(market, market.outcomes, { homeTeam, awayTeam }).map((outcome) => (
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
              bettable={bettable}
            />
          ))}
        </div>
      )}
    </div>
  );
}
