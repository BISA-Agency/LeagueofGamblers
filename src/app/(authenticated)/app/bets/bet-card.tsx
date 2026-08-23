"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Check, Clock, X } from "lucide-react";
import { settleProofBetSelf } from "@/actions/proof-bets";
import { LegMark, SLIP_STRIPE, SlipStatusPill, type SlipStatus } from "@/components/bets/slip-chrome";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Bet, BetSelection } from "@drizzle/schema";

const placedFormatter = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Amsterdam",
});

const kickoffFormatter = new Intl.DateTimeFormat("nl-NL", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Amsterdam",
});

const euro = (n: number) =>
  `€${n.toLocaleString("nl-NL", {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;

/** half_won/half_lost settle as a full win/loss for the slip's purposes. */
function slipStatus(status: string): SlipStatus {
  if (status === "won" || status === "half_won") return "won";
  if (status === "lost" || status === "half_lost") return "lost";
  if (status === "void") return "void";
  return "open";
}

const VERIFICATION: Record<string, { label: string; icon: typeof Check; className: string }> = {
  pending: { label: "Wacht op controle", icon: Clock, className: "text-muted-foreground" },
  approved: { label: "Goedgekeurd", icon: Check, className: "text-profit" },
  rejected: { label: "Afgekeurd", icon: X, className: "text-loss" },
};

export function BetCard({ bet }: { bet: Bet & { selections: BetSelection[] } }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const canSelfSettle = bet.kind === "proof" && bet.status === "open" && bet.eventStart <= new Date();

  const status = slipStatus(bet.status);
  const settled = status !== "open";
  const verification = bet.kind === "proof" ? VERIFICATION[bet.verificationStatus] : null;

  function settle(next: "won" | "lost" | "void") {
    setError(null);
    startTransition(async () => {
      try {
        await settleProofBetSelf(bet.id, next);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Settelen mislukt.");
      }
    });
  }

  return (
    <article className="relative overflow-hidden rounded-lg border border-border bg-card">
      <span aria-hidden className={cn("absolute inset-y-0 left-0 w-[3px]", SLIP_STRIPE[status])} />

      <header className="flex items-start justify-between gap-3 py-3 pl-4 pr-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            {bet.type === "combi" ? `Combi · ${bet.selections.length} selecties` : "Single"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {bet.kind === "proof" ? "Bewijsbet" : "Sportsbook"} · geplaatst{" "}
            {placedFormatter.format(bet.placedAt)}
          </p>
        </div>
        <SlipStatusPill status={status} />
      </header>

      <ul className="space-y-2.5 border-t border-border py-3 pl-4 pr-3">
        {bet.selections.map((s) => (
          <li key={s.id} className="flex items-start gap-2.5">
            <LegMark result={s.result} settled={settled} size="md" />
            <div className="min-w-0 flex-1">
              {/* Three weights, not one: the pick, then the fixture, then when
                  it starts. The old card set all three in the same grey. */}
              <p className="truncate text-sm font-medium">{s.selectionLabel}</p>
              <p className="truncate text-xs text-muted-foreground">
                {s.eventName}
                <span className="px-1.5 text-muted-foreground/40">|</span>
                {s.marketLabel}
              </p>
              <p className="truncate text-[11px] tabular-nums text-muted-foreground/70">
                {kickoffFormatter.format(s.eventStart)}
              </p>
            </div>
            <span className="shrink-0 text-sm font-semibold tabular-nums">{s.odds.toFixed(2)}</span>
          </li>
        ))}
      </ul>

      {/* The ledger. Label left, value right, one line each — the numbers a
          bookmaker's slip actually tears off with. */}
      <dl className="space-y-1.5 border-t border-dashed border-border py-3 pl-4 pr-3 text-sm">
        <Row label="Inzet" value={euro(bet.stake)} />
        <Row label="Totale odds" value={bet.totalOdds.toFixed(2)} />
        {status === "won" ? (
          <Row label="Uitbetaald" value={`+${euro(bet.potentialPayout)}`} tone="profit" strong />
        ) : status === "lost" ? (
          <Row label="Verloren" value={`−${euro(bet.stake)}`} tone="loss" strong />
        ) : status === "void" ? (
          <Row label="Terugbetaald" value={euro(bet.stake)} />
        ) : (
          <Row label="Mogelijke uitbetaling" value={euro(bet.potentialPayout)} strong />
        )}
      </dl>

      {verification && (
        <p
          className={cn(
            "flex items-center gap-1.5 border-t border-border py-2 pl-4 pr-3 text-[11px]",
            verification.className
          )}
        >
          <verification.icon className="size-3.5" />
          {verification.label}
        </p>
      )}

      {canSelfSettle && (
        <div className="space-y-2 border-t border-border py-3 pl-4 pr-3">
          <p className="text-[11px] text-muted-foreground">
            De wedstrijd is afgelopen — zet zelf de uitslag.
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-9 flex-1" disabled={pending} onClick={() => settle("won")}>
              Gewonnen
            </Button>
            <Button size="sm" variant="outline" className="h-9 flex-1" disabled={pending} onClick={() => settle("lost")}>
              Verloren
            </Button>
            <Button size="sm" variant="outline" className="h-9 flex-1" disabled={pending} onClick={() => settle("void")}>
              Void
            </Button>
          </div>
          {error && (
            <p className="flex items-center gap-1.5 text-xs text-loss">
              <AlertTriangle className="size-3.5" />
              {error}
            </p>
          )}
        </div>
      )}
    </article>
  );
}

function Row({
  label,
  value,
  tone,
  strong,
}: {
  label: string;
  value: string;
  tone?: "profit" | "loss";
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "tabular-nums",
          strong ? "text-base font-semibold" : "text-sm",
          tone === "profit" && "text-profit",
          tone === "loss" && "text-loss"
        )}
      >
        {value}
      </dd>
    </div>
  );
}
