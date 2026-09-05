import type { ReferralCredits } from "@/lib/referrals/credits";
import { cn } from "@/lib/utils";

const euro = new Intl.NumberFormat("nl-NL", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * What you have earned by bringing players in, and what is still coming.
 *
 * The headline is what is still owed, not what was ever earned — a number that
 * only goes up would keep claiming money that has already been sent.
 */
export function ReferralCredits({
  credits,
  className,
}: {
  credits: ReferralCredits;
  className?: string;
}) {
  const { entries, total, paidOut, outstanding } = credits;

  return (
    <section
      className={cn("rounded-xl border border-accent-brand/40 bg-card p-4 sm:p-5", className)}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-medium">Nog uit te betalen</h3>
        <p className="text-2xl font-semibold tabular-nums text-accent-brand">
          €{euro.format(outstanding)}
        </p>
      </div>

      {entries.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Nog niets verdiend. Zodra iemand die jij hebt uitgenodigd zijn inleg betaalt, staat hier
          je eerste tegoed.
        </p>
      ) : (
        <>
          <ul className="mt-3 divide-y divide-border/70 text-sm">
            {entries.map((entry, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="truncate font-medium">{entry.inviteeUsername}</span>{" "}
                  <span className="text-muted-foreground">— {entry.challengeName}</span>
                </span>
                <span className="shrink-0 tabular-nums">
                  {entry.credit > 0 ? (
                    <span className="text-accent-brand">€{euro.format(entry.credit)}</span>
                  ) : (
                    // A challenge with no service fee generates nothing to
                    // share. Saying so beats a silent zero.
                    <span className="text-muted-foreground">geen servicekosten</span>
                  )}
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-3 border-t border-border pt-3 text-xs tabular-nums text-muted-foreground">
            Totaal verdiend €{euro.format(total)}
            {paidOut > 0 && <> · daarvan is €{euro.format(paidOut)} al uitbetaald</>}
          </p>
        </>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        Uitbetaling gaat in USDT naar het adres in je profiel, met de hand. Zeg het even als er
        iets openstaat en je het wilt ontvangen.
      </p>
    </section>
  );
}
