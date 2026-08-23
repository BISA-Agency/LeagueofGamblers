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
}) {
  const { addSelection, isSelected } = useBetSlip();
  const selected = isSelected(outcomeId);

  return (
    <button
      type="button"
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
        "flex min-h-11 flex-1 items-center justify-between gap-2 rounded-md border px-2.5 py-2 transition-colors",
        selected
          ? "border-accent-brand bg-accent-brand/10"
          : "border-border bg-secondary/40 hover:border-foreground/25 hover:bg-secondary/70"
      )}
    >
      <span
        className={cn(
          "min-w-0 truncate text-xs",
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
