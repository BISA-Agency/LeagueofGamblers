import { ArrowRight, Users } from "lucide-react";
import Link from "next/link";
import { CopyField } from "@/components/payments/copy-field";
import { getSiteUrl } from "@/lib/site-url";
import { cn } from "@/lib/utils";

export type InviteTier = { count: number; label: string; reached: boolean };

/**
 * The mission list is where a referral is recorded; this is where it actually
 * happens. Nobody shares a link they have to go hunting for, so the code, the
 * link and the progress sit together on the profile.
 */
export function InvitePanel({
  code,
  confirmed,
  tiers,
}: {
  code: string;
  /** Invitees who have paid a buy-in — the only ones that count. */
  confirmed: number;
  tiers: InviteTier[];
}) {
  const next = tiers.find((t) => !t.reached) ?? null;
  const target = next?.count ?? tiers.at(-1)?.count ?? 1;
  const percent = Math.min(100, (confirmed / target) * 100);
  const link = `${getSiteUrl()}/?ref=${code}`;

  return (
    <section className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-medium">
            <Users className="size-4 text-muted-foreground" />
            Nodig spelers uit
          </h2>
          <p className="text-xs text-muted-foreground">
            Iemand telt mee zodra die meedoet én zijn inleg betaald heeft.
          </p>
        </div>
        <span className="shrink-0 text-right">
          <span className="block text-xl font-semibold tabular-nums text-accent-brand">
            {confirmed}
          </span>
          <span className="block text-[11px] text-muted-foreground">binnen</span>
        </span>
      </div>

      <CopyField label="Jouw uitnodigingslink" value={link} mono={false} />

      <div className="space-y-1.5">
        <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-accent-brand" style={{ width: `${percent}%` }} />
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {tiers.map((t) => (
            <span
              key={t.count}
              className={cn(
                "text-[11px] tabular-nums",
                t.reached ? "font-medium text-accent-brand" : "text-muted-foreground"
              )}
            >
              {t.reached ? "✓" : ""} {t.count} · {t.label}
            </span>
          ))}
        </div>
      </div>

      {/* The ladder above is the summary; the money, who came in and how it
          is paid out live on their own page, because they do not fit here. */}
      <Link
        href="/referral"
        className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-accent-brand/50 bg-accent-brand/10 px-3 text-sm font-medium text-accent-brand transition-colors hover:bg-accent-brand/15"
      >
        Verdien geld met uitnodigen
        <ArrowRight className="size-4 shrink-0" />
      </Link>

      <p className="text-[11px] text-muted-foreground">
        Code: <code className="font-mono text-foreground">{code}</code> — werkt ook achter een
        challenge-link, bijvoorbeeld <span className="font-mono">/c/september-2026?ref={code}</span>
      </p>
    </section>
  );
}
