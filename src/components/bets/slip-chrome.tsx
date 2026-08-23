import { Check, Minus, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The shared vocabulary of a bet slip: the stripe that tells you the outcome
 * at a glance, the pill that names it, and the mark on each leg. The compact
 * slip in the activity feed and the full slip on /app/bets are the same object
 * at two sizes, so they must not drift apart.
 */
export type SlipStatus = "sealed" | "open" | "won" | "lost" | "void";

export const SLIP_STRIPE: Record<SlipStatus, string> = {
  sealed: "bg-border",
  open: "bg-accent-brand/50",
  won: "bg-profit",
  lost: "bg-loss",
  void: "bg-border",
};

const PILL: Record<SlipStatus, { label: string; className: string }> = {
  sealed: { label: "Verzegeld", className: "border-border text-muted-foreground" },
  open: { label: "Loopt", className: "border-accent-brand/40 bg-accent-brand/10 text-accent-brand" },
  won: { label: "Gewonnen", className: "border-profit/40 bg-profit/15 text-profit" },
  lost: { label: "Verloren", className: "border-loss/40 bg-loss/15 text-loss" },
  void: { label: "Void", className: "border-border text-muted-foreground" },
};

export function SlipStatusPill({ status }: { status: SlipStatus }) {
  const pill = PILL[status];
  return (
    <span
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        pill.className
      )}
    >
      {status === "open" && <span className="size-1.5 rounded-full bg-accent-brand" />}
      {pill.label}
    </span>
  );
}

/** Per-leg outcome. Unsettled legs get a hollow ring, not a mark. */
export function LegMark({
  result,
  settled,
  size = "sm",
}: {
  result: string | null;
  settled: boolean;
  size?: "sm" | "md";
}) {
  const box = size === "md" ? "size-4" : "size-3.5";
  if (!settled || result === null) {
    return <span className={cn("mt-0.5 shrink-0 rounded-full border border-border", box)} />;
  }
  if (result === "lost" || result === "half_lost") {
    return <X className={cn("mt-0.5 shrink-0 text-loss", box)} />;
  }
  if (result === "void") {
    return (
      <span className={cn("mt-0.5 flex shrink-0 items-center justify-center text-muted-foreground", box)}>
        <Minus className="size-3" />
      </span>
    );
  }
  return <Check className={cn("mt-0.5 shrink-0 text-profit", box)} />;
}
