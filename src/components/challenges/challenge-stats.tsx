import { Users } from "lucide-react";
import type { ChallengeStats } from "@/lib/challenges/stats";
import { cn } from "@/lib/utils";

const money = new Intl.NumberFormat("nl-NL", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const RANK_LABEL = ["Winnaar", "Tweede", "Derde"];

/**
 * Players and pot, side by side, with the pot as the loudest number on the
 * page — it's the reason someone joins. Both follow the paid count, so they
 * grow as the group fills up.
 */
export function ChallengeStatsPanel({
  stats,
  buyIn,
  className,
  showSplit = true,
}: {
  stats: ChallengeStats;
  buyIn: number;
  className?: string;
  showSplit?: boolean;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-5", className)}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="size-3.5" />
            Spelers
          </p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">
            {stats.joinedCount}
            {stats.maxPlayers && (
              <span className="text-lg text-muted-foreground">/{stats.maxPlayers}</span>
            )}
          </p>
          {stats.unpaidCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {stats.paidCount} betaald · {stats.unpaidCount} nog niet
            </p>
          )}
        </div>

        <div className="text-right">
          <p className="text-xs text-muted-foreground">Prijzenpot</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-accent-brand">
            €{money.format(stats.pot)}
          </p>
          <p className="text-xs text-muted-foreground">
            {stats.unpaidCount > 0
              ? `€${money.format(stats.potentialPot)} als iedereen betaalt`
              : `${stats.paidCount} × €${money.format(buyIn)}`}
          </p>
        </div>
      </div>

      {showSplit && stats.split.length > 0 && (
        <div className="mt-4 grid gap-2 border-t border-border pt-4 sm:grid-cols-3">
          {stats.split.map((entry) => (
            <div key={entry.rank} className="flex items-baseline justify-between sm:block sm:text-center">
              <p className="text-xs text-muted-foreground">
                {RANK_LABEL[entry.rank - 1] ?? `#${entry.rank}`}
              </p>
              <p className="text-lg font-semibold tabular-nums">€{money.format(entry.amount)}</p>
            </div>
          ))}
        </div>
      )}

      {stats.paidCount === 0 && (
        <p className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">
          De pot groeit zodra spelers hun inleg betalen — €{money.format(buyIn)} per persoon.
        </p>
      )}
    </div>
  );
}
