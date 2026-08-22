"use client";

import { cn } from "@/lib/utils";
import { useBetSlip } from "@/lib/betslip/context";

export function OutcomeButton({
  outcomeId,
  label,
  odds,
  eventId,
  eventName,
  eventStart,
  sport,
  competition,
  marketLabel,
}: {
  outcomeId: string;
  label: string;
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
      onClick={() =>
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
        })
      }
      className={cn(
        "flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-md border px-2 py-2 text-center transition-colors",
        selected
          ? "border-accent-brand bg-accent-brand/10 text-accent-brand"
          : "border-border hover:bg-secondary/50"
      )}
    >
      <span className="truncate text-xs text-muted-foreground">{label}</span>
      <span className="tabular-nums text-sm font-semibold">{odds.toFixed(2)}</span>
    </button>
  );
}
