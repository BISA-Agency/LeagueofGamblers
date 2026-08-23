import { Lock } from "lucide-react";
import { LegMark, SLIP_STRIPE } from "@/components/bets/slip-chrome";
import { cn } from "@/lib/utils";

const kickoffFormatter = new Intl.DateTimeFormat("nl-NL", {
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Amsterdam",
});

export type FeedBetSlipLeg = {
  id: string;
  eventName: string;
  selectionLabel: string;
  marketLabel: string;
  odds: number;
  result: string | null;
};

/**
 * What the feed is allowed to know about a bet. A sealed slip carries no
 * selection labels and no odds at all — hiding them in CSS would leave them
 * readable in the page source, which is exactly the leak the reveal rule
 * (§5.4) exists to prevent.
 */
export type FeedBetSlipData =
  | {
      revealed: false;
      betId: string;
      stake: number;
      legCount: number;
      kickoff: Date;
    }
  | {
      revealed: true;
      betId: string;
      stake: number;
      legCount: number;
      status: "open" | "won" | "lost" | "void";
      totalOdds: number;
      potentialPayout: number;
      legs: FeedBetSlipLeg[];
    };

/**
 * Bar widths for a sealed slip. Derived from the bet id so a slip looks the
 * same on every render — a redaction that reshuffles reads as a loading
 * skeleton, and it would flicker on every revalidate.
 */
function redactionWidths(betId: string, count: number): number[] {
  let h = 2166136261;
  for (let i = 0; i < betId.length; i++) {
    h = Math.imul(h ^ betId.charCodeAt(i), 16777619) >>> 0;
  }
  return Array.from({ length: count }, () => {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0;
    return 48 + ((h >>> 9) % 38);
  });
}

const euro = (n: number) =>
  `€${n.toLocaleString("nl-NL", {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;

/**
 * A flat grey bar reads as a loading skeleton. The hatch says the value is
 * being withheld on purpose — which is the whole point of a sealed slip.
 */
const REDACTION = {
  backgroundImage:
    "repeating-linear-gradient(45deg, rgba(255,255,255,0.055) 0 3px, rgba(255,255,255,0.11) 3px 6px)",
};

export function FeedBetSlip({ slip }: { slip: FeedBetSlipData }) {
  const state = slip.revealed ? slip.status : "sealed";
  const typeLabel =
    slip.legCount > 1 ? `Combi · ${slip.legCount} selecties` : "Single";

  return (
    <div className="relative mt-2 overflow-hidden rounded-md border border-border bg-secondary/25">
      <span
        aria-hidden
        className={cn("absolute inset-y-0 left-0 w-[3px]", SLIP_STRIPE[state])}
      />

      <div className="space-y-2 py-2.5 pl-4 pr-3">
        <div className="flex items-center justify-between gap-2">
          <StateLabel state={state} />
          <span className="shrink-0 text-[11px] text-muted-foreground">{typeLabel}</span>
        </div>

        {slip.revealed ? (
          <ul className="space-y-1.5">
            {slip.legs.map((leg) => (
              <li key={leg.id} className="flex items-start gap-2">
                <LegMark result={leg.result} settled={slip.status !== "open"} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{leg.selectionLabel}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {leg.eventName} · {leg.marketLabel}
                  </p>
                </div>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {leg.odds.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="space-y-2" aria-label={`${slip.legCount} verborgen selecties`}>
            {redactionWidths(slip.betId, slip.legCount).map((width, i) => (
              <li key={i} className="flex items-center gap-2">
                <span
                  className="h-2.5 rounded-sm"
                  style={{ ...REDACTION, width: `${width}%` }}
                />
                <span className="ml-auto h-2.5 w-8 shrink-0 rounded-sm" style={REDACTION} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-dashed border-border">
        <div className="flex items-center justify-between gap-2 py-2 pl-4 pr-3">
          <span className="text-[11px] tabular-nums text-muted-foreground">
            Inzet {euro(slip.stake)}
            {slip.revealed && ` · odds ${slip.totalOdds.toFixed(2)}`}
          </span>
          <Payout slip={slip} />
        </div>
      </div>
    </div>
  );
}

function StateLabel({ state }: { state: string }) {
  if (state === "sealed") {
    return (
      <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <Lock className="size-3" />
        Verzegeld
      </span>
    );
  }
  if (state === "open") {
    return (
      <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-accent-brand">
        <span className="size-1.5 rounded-full bg-accent-brand" />
        Loopt
      </span>
    );
  }
  const label =
    state === "won" ? "Gewonnen" : state === "lost" ? "Verloren" : "Void";
  return (
    <span
      className={cn(
        "text-[11px] font-medium uppercase tracking-wide",
        state === "won" && "text-profit",
        state === "lost" && "text-loss",
        state === "void" && "text-muted-foreground"
      )}
    >
      {label}
    </span>
  );
}

function Payout({ slip }: { slip: FeedBetSlipData }) {
  if (!slip.revealed) {
    return (
      <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
        Zichtbaar bij aftrap · {kickoffFormatter.format(slip.kickoff)}
      </span>
    );
  }
  if (slip.status === "won") {
    return (
      <span className="shrink-0 text-xs font-semibold tabular-nums text-profit">
        +{euro(slip.potentialPayout)}
      </span>
    );
  }
  if (slip.status === "lost") {
    return (
      <span className="shrink-0 text-xs font-semibold tabular-nums text-loss">
        −{euro(slip.stake)}
      </span>
    );
  }
  if (slip.status === "void") {
    return (
      <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
        Inzet terug
      </span>
    );
  }
  return (
    <span className="shrink-0 text-xs font-semibold tabular-nums">
      Mogelijk {euro(slip.potentialPayout)}
    </span>
  );
}
