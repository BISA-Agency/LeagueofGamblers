import { LegMark, SLIP_STRIPE, SlipStatusPill, slipStatusOf } from "@/components/bets/slip-chrome";
import type { SharedBet } from "@/lib/bets/shared-bet";
import { cn } from "@/lib/utils";

const money = (n: number) =>
  `€${n.toLocaleString("nl-NL", {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;

const kickoffFormatter = new Intl.DateTimeFormat("nl-NL", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Amsterdam",
});

/**
 * A slip as a stranger sees it on /b/[id]: the same object as the card on
 * /app/bets, minus everything only its owner may act on — no self-settle
 * buttons, no verification state, no bookmaker.
 */
export function SharedBetSlip({ bet }: { bet: SharedBet }) {
  const status = slipStatusOf(bet.status);
  const settled = status !== "open";

  return (
    <article className="relative overflow-hidden rounded-lg border border-border bg-card">
      <span aria-hidden className={cn("absolute inset-y-0 left-0 w-[3px]", SLIP_STRIPE[status])} />

      <header className="flex items-start justify-between gap-3 py-3 pl-4 pr-3">
        <p className="text-sm font-semibold">
          {bet.type === "combi" ? `Combi · ${bet.selections.length} selecties` : "Single"}
        </p>
        <SlipStatusPill status={status} />
      </header>

      <ul className="space-y-2.5 border-t border-border py-3 pl-4 pr-3">
        {bet.selections.map((s) => (
          <li key={s.id} className="flex items-start gap-2.5">
            <LegMark result={s.result} settled={settled} size="md" />
            <div className="min-w-0 flex-1">
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
            <span className="shrink-0 text-sm font-semibold tabular-nums">
              {s.odds.toFixed(2)}
            </span>
          </li>
        ))}
      </ul>

      <dl className="space-y-1.5 border-t border-dashed border-border py-3 pl-4 pr-3 text-sm">
        <Row label="Inzet" value={money(bet.stake)} />
        <Row label="Totale odds" value={bet.totalOdds.toFixed(2)} />
        {status === "won" ? (
          <Row label="Uitbetaald" value={`+${money(bet.potentialPayout)}`} tone="profit" strong />
        ) : status === "lost" ? (
          <Row label="Verloren" value={`−${money(bet.stake)}`} tone="loss" strong />
        ) : status === "void" ? (
          <Row label="Terugbetaald" value={money(bet.stake)} />
        ) : (
          <Row label="Mogelijke uitbetaling" value={money(bet.potentialPayout)} strong />
        )}
      </dl>
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
