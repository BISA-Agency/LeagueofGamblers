import { TrendingDown, TrendingUp } from "lucide-react";
import type { BetSummary } from "@/lib/stats/bets";

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary/50 px-3 py-2.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-base font-semibold tabular-nums">{value}</p>
    </div>
  );
}

/**
 * All-time career stats, across every challenge someone has ever played —
 * separate from the per-challenge stats block, which resets its meaning each
 * challenge. Framed in the brand accent so it reads as the one section on
 * the profile worth lingering on.
 */
export function CareerCard({ stats }: { stats: BetSummary }) {
  const total = stats.wonCount + stats.voidCount + stats.lostCount;
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
  const positive = stats.roi > 0;
  const negative = stats.roi < 0;

  return (
    <section className="space-y-4 rounded-xl border border-accent-brand/35 bg-card p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Carrière
        </h2>
        <p className="text-[11px] tabular-nums text-muted-foreground">
          {stats.betsCount} bets · all-time
        </p>
      </div>

      <div>
        <p className="text-[11px] text-muted-foreground">ROI</p>
        <div className="flex items-center gap-1.5">
          <span
            className={`text-4xl font-semibold tabular-nums ${
              positive ? "text-profit" : negative ? "text-loss" : "text-foreground"
            }`}
          >
            {positive ? "+" : ""}
            {stats.roi.toFixed(1)}%
          </span>
          {positive && <TrendingUp className="size-5 text-profit" />}
          {negative && <TrendingDown className="size-5 text-loss" />}
        </div>
        <p className="text-[11px] text-muted-foreground">winst t.o.v. totaal ingezet</p>
      </div>

      <div className="h-px bg-border" />

      <div className="grid grid-cols-3 gap-2.5">
        <StatTile label="Winrate" value={`${stats.winrate.toFixed(0)}%`} />
        <StatTile label="Gem. quotering" value={stats.avgOdds.toFixed(2)} />
        <StatTile
          label="Hoogste gewonnen"
          value={stats.highestWonOdds > 0 ? stats.highestWonOdds.toFixed(2) : "—"}
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>Record</span>
          <span className="tabular-nums">
            {stats.wonCount}W · {stats.voidCount}V · {stats.lostCount}L
          </span>
        </div>
        <div className="flex h-2 overflow-hidden rounded-full bg-secondary">
          {stats.wonCount > 0 && (
            <div className="h-full bg-accent-brand" style={{ width: `${pct(stats.wonCount)}%` }} />
          )}
          {stats.voidCount > 0 && (
            <div
              className="h-full bg-muted-foreground/40"
              style={{ width: `${pct(stats.voidCount)}%` }}
            />
          )}
          {stats.lostCount > 0 && (
            <div className="h-full bg-loss" style={{ width: `${pct(stats.lostCount)}%` }} />
          )}
        </div>
      </div>
    </section>
  );
}
