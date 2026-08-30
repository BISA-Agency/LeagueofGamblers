"use client";

import { cn } from "@/lib/utils";
import { useBetSlip } from "@/lib/betslip/context";

export function OutcomeButton({
  outcomeId,
  label,
  displayLabel,
  odds,
  eventId,
  eventName,
  eventStart,
  sport,
  competition,
  marketLabel,
  stacked = false,
  bettable = true,
}: {
  outcomeId: string;
  /** What the bet slip and settlement see — always the real outcome label. */
  label: string;
  /** What the button shows: "1" / "X" / "2" on a card, the full label elsewhere. */
  displayLabel?: string;
  odds: number;
  eventId: string;
  eventName: string;
  eventStart: string;
  sport: string;
  competition?: string | null;
  marketLabel: string;
  /** Label above the price instead of beside it, for labels too long to sit on one line. */
  stacked?: boolean;
  /** False once this particular fixture has kicked off. */
  bettable?: boolean;
}) {
  const { addSelection, isSelected, canBet } = useBetSlip();
  const selected = isSelected(outcomeId);
  // Two different reasons a price can be look-but-don't-touch: the challenge
  // hasn't opened, or this match has already started.
  const live = canBet && bettable;

  return (
    <button
      type="button"
      // Before a challenge opens the prices are worth looking at but nothing
      // can be staked on them, so the button says so by not responding rather
      // than by filling a slip that has nowhere to go.
      disabled={!live}
      onClick={() => {
        addSelection({
          outcomeId,
          eventId,
          eventName,
          eventStart,
          sport,
          competition: competition ?? undefined,
          marketLabel,
          selectionLabel: label,
          odds,
        });
      }}
      aria-pressed={selected}
      // Label left, price right: the price is what the eye goes to, so it gets
      // the fixed edge to line up along.
      className={cn(
        // min-w-0: a flex item defaults to min-width:auto and refuses to shrink
        // below its content, which made the label's truncate useless and pushed
        // long outcomes ("Chelsea of Gelijkspel") off the side of the phone.
        "flex min-h-11 min-w-0 flex-1 rounded-md border px-2.5 py-2 transition-colors",
        stacked
          ? "flex-col items-center justify-center gap-0.5 text-center"
          : "items-center justify-between gap-2",
        selected
          ? "border-accent-brand bg-accent-brand/10"
          : "border-border bg-secondary/40",
        live && !selected && "hover:border-foreground/25 hover:bg-secondary/70",
        !live && "cursor-default opacity-70"
      )}
    >
      <span
        className={cn(
          "text-xs",
          // Truncating "Chelsea of Gelijkspel" to "Chelse…" makes it identical
          // to "Chelsea of Fulham", so a long label wraps rather than clips.
          stacked ? "leading-tight text-balance" : "min-w-0 truncate",
          selected ? "text-accent-brand" : "text-muted-foreground"
        )}
      >
        {displayLabel ?? label}
      </span>
      <span
        className={cn(
          "shrink-0 text-sm font-semibold tabular-nums",
          selected ? "text-accent-brand" : "text-foreground"
        )}
      >
        {odds.toFixed(2)}
      </span>
    </button>
  );
}
