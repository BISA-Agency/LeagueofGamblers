import { Check, Coins, Share2, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CopyField } from "@/components/payments/copy-field";
import { ReferralCredits } from "@/components/profile/referral-credits";
import { db } from "@/lib/db";
import { countConfirmedReferrals, ensureInviteCode } from "@/lib/referrals/assign";
import { CREDIT_SHARE_OF_FEE, getReferralCredits } from "@/lib/referrals/credits";
import { REFERRAL_TIERS } from "@/lib/referrals/tiers";
import { getSiteUrl } from "@/lib/site-url";
import { challenges, profiles } from "@drizzle/schema";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { eq } from "drizzle-orm";

export const metadata: Metadata = { title: "Verdien mee" };

const euro = new Intl.NumberFormat("nl-NL", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Everything about bringing someone in, on one page.
 *
 * It lives at /referral rather than under /app because it is the page people
 * will link each other to, and a link you have to explain ("no, /app/referral")
 * is a link nobody sends. Middleware still gates it: this is the sharer's own
 * dashboard, not the landing page an invitee sees.
 */
export default async function ReferralPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [code, confirmed, credits, invitees, feeChallenge] = await Promise.all([
    ensureInviteCode(user.id),
    countConfirmedReferrals(user.id),
    getReferralCredits(user.id),
    db.query.profiles.findMany({
      where: eq(profiles.invitedBy, user.id),
      columns: { username: true },
      with: { participations: { columns: { paidBuyIn: true } } },
    }),
    // Whatever a new player would pay next — that is the deal being described,
    // not some average of what has been.
    db.query.challenges.findFirst({
      where: eq(challenges.status, "open"),
      orderBy: (c, { asc }) => asc(c.startAt),
      columns: { name: true, buyInAmount: true, platformFeePercent: true },
    }),
  ]);

  const link = code ? `${getSiteUrl()}/?ref=${code}` : null;
  const perReferral = feeChallenge
    ? Math.round(
        ((feeChallenge.buyInAmount * feeChallenge.platformFeePercent) / 100) *
          CREDIT_SHARE_OF_FEE *
          100
      ) / 100
    : 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Neem iemand mee, verdien mee</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {perReferral > 0 ? (
            <>
              Voor elke speler die jij binnenbrengt krijg jij{" "}
              <span className="font-medium text-accent-brand">€{euro.format(perReferral)}</span> —
              elke maand dat hij meebetaalt, niet één keer.
            </>
          ) : (
            <>
              Voor elke speler die jij binnenbrengt deel je mee in de inleg die hij betaalt, elke
              maand dat hij meespeelt.
            </>
          )}
        </p>
      </header>

      {link ? (
        <section className="space-y-3 rounded-xl border border-accent-brand/40 bg-accent-brand/5 p-4 sm:p-5">
          <h2 className="flex items-center gap-1.5 text-sm font-medium">
            <Share2 className="size-4 text-accent-brand" />
            Jouw link
          </h2>
          <CopyField label="" value={link} mono={false} />
          <p className="text-xs text-muted-foreground">
            Wie hem opent en meedoet, telt automatisch als jouw aanbreng. Je code werkt ook achter
            een challenge-link: <span className="font-mono">/c/september-2026?ref={code}</span>
          </p>
        </section>
      ) : (
        <p className="text-sm text-loss">
          Je hebt nog geen uitnodigingscode. Laad de pagina opnieuw — hij wordt automatisch
          aangemaakt.
        </p>
      )}

      <ReferralCredits credits={credits} />

      <section className="space-y-3 rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="flex items-center gap-1.5 text-sm font-medium">
          <UserPlus className="size-4 text-muted-foreground" />
          Wie je hebt binnengebracht
          <span className="ml-auto tabular-nums text-accent-brand">{confirmed}</span>
        </h2>

        {invitees.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nog niemand. Deel je link met iemand die van voetbal houdt en denkt dat hij er verstand
            van heeft.
          </p>
        ) : (
          <ul className="divide-y divide-border/70 text-sm">
            {invitees.map((invitee) => {
              const paid = invitee.participations.some((p) => p.paidBuyIn);
              return (
                <li key={invitee.username} className="flex items-center justify-between gap-3 py-2">
                  <span className="truncate">{invitee.username}</span>
                  <span
                    className={cn(
                      "shrink-0 text-xs",
                      paid ? "text-accent-brand" : "text-muted-foreground"
                    )}
                  >
                    {paid ? "meebetaald" : "nog niet betaald"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        <p className="text-xs text-muted-foreground">
          Aanmelden alleen telt niet — pas als iemand zijn inleg betaalt, telt hij mee.
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="flex items-center gap-1.5 text-sm font-medium">
          <Coins className="size-4 text-muted-foreground" />
          Daarnaast: XP en status
        </h2>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {REFERRAL_TIERS.map((tier) => {
            const reached = confirmed >= tier.count;
            return (
              <span
                key={tier.count}
                className={cn(
                  "flex items-center gap-1 text-xs tabular-nums",
                  reached ? "font-medium text-accent-brand" : "text-muted-foreground"
                )}
              >
                {reached && <Check className="size-3" />}
                {tier.count} · {tier.label}
                <span className="text-muted-foreground">({tier.xp} XP)</span>
              </span>
            );
          })}
        </div>
      </section>

      <section className="space-y-2 rounded-xl border border-border bg-secondary/30 p-4 text-sm sm:p-5">
        <h2 className="font-medium">Hoe het werkt</h2>
        <ol className="list-decimal space-y-1.5 pl-4 text-muted-foreground">
          <li>Je deelt je link.</li>
          <li>Hij maakt een account en betaalt zijn inleg voor een challenge.</li>
          <li>
            Jij krijgt {Math.round(CREDIT_SHARE_OF_FEE * 100)}% van de servicekosten op die inleg —
            elke maand opnieuw zolang hij meespeelt.
          </li>
          <li>Je tegoed wordt in USDT uitbetaald op het adres in je profiel.</li>
        </ol>
        <p className="pt-1 text-xs text-muted-foreground">
          Nog geen uitbetaaladres ingesteld?{" "}
          <Link
            href="/app/profile/edit"
            className="text-accent-brand underline underline-offset-2"
          >
            Dat doe je hier.
          </Link>
        </p>
      </section>
    </div>
  );
}
