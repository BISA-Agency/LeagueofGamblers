const money = new Intl.NumberFormat("nl-NL", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * Opens the page with the reason to scroll it: what is still on the table.
 * A count of completed missions alone reads as admin; the euro figure is the
 * pull.
 */
export function MissionSummary({
  openCash,
  completed,
  total,
}: {
  openCash: number;
  completed: number;
  total: number;
}) {
  const percent = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Nog te verdienen</p>
          <p className="text-3xl font-semibold tabular-nums text-accent-brand">
            €{money.format(openCash)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Behaald</p>
          <p className="text-3xl font-semibold tabular-nums">
            {completed}
            <span className="text-lg text-muted-foreground">/{total}</span>
          </p>
        </div>
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-accent-brand transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>

      {openCash === 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          Geen geldprijzen open. XP valt er hieronder nog genoeg te halen.
        </p>
      )}
    </div>
  );
}
