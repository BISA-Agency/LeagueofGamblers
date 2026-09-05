import type { Metadata } from "next";
import { ReferralPayoutForm } from "@/components/admin/referral-payout-form";
import { ReferralCredits } from "@/components/profile/referral-credits";
import { db } from "@/lib/db";
import { explorerTxUrl, getNetwork } from "@/lib/payments/networks";
import {
  CREDIT_SHARE_OF_FEE,
  getReferralCredits,
  type ReferralCredits as ReferralCreditsData,
} from "@/lib/referrals/credits";

export const metadata: Metadata = { title: "Aanbrengtegoed" };

const euro = new Intl.NumberFormat("nl-NL", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Invented, and labelled as such on the page — see the note beside it. */
const EXAMPLE: ReferralCreditsData = {
  entries: [
    { inviteeUsername: "danilo_bet", challengeName: "Oktober 2026", challengeStatus: "open", buyIn: 100, feePercent: 10, credit: 5 },
    { inviteeUsername: "sander", challengeName: "Oktober 2026", challengeStatus: "open", buyIn: 100, feePercent: 10, credit: 5 },
    { inviteeUsername: "sander", challengeName: "November 2026", challengeStatus: "open", buyIn: 100, feePercent: 10, credit: 5 },
  ],
  total: 15,
  paidOut: 0,
  outstanding: 15,
  nextBuyIn: 100,
  nextChallengeName: "December 2026",
  applicable: 15,
};

/**
 * The referral-credit idea, on real data, before anyone is promised anything.
 *
 * Admin-only. What is earned gets computed on the spot from who invited whom;
 * only what has been paid out is stored, in referral_payouts. Nothing outside
 * /admin renders any of it, so dropping the whole idea is deleting the files
 * and one `drop table`.
 */
export default async function ReferralsPreviewPage() {
  const everyone = await db.query.profiles.findMany({
    columns: { id: true, username: true, payoutAddress: true, payoutNetwork: true, invitedBy: true },
    orderBy: (p, { asc }) => asc(p.username),
  });

  // Only the people who actually invited someone need the full calculation.
  // Running it for every profile meant a fistful of queries each and pushed
  // this page past the build timeout — for eleven rows of which one earns.
  const hasInvitees = new Set(everyone.map((p) => p.invitedBy).filter(Boolean) as string[]);

  const [rows, payouts] = await Promise.all([
    Promise.all(
      everyone
        .filter((p) => hasInvitees.has(p.id))
        .map(async (p) => ({ ...p, credits: await getReferralCredits(p.id) }))
    ),
    db.query.referralPayouts.findMany({ orderBy: (r, { desc }) => desc(r.createdAt) }),
  ]);

  const nameById = new Map(everyone.map((p) => [p.id, p.username]));
  const earners = rows.filter((r) => r.credits.entries.length > 0);
  const earned = earners.reduce((sum, r) => sum + r.credits.total, 0);
  const outstanding = earners.reduce((sum, r) => sum + r.credits.outstanding, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Aanbrengtegoed</h1>
        <p className="text-sm text-muted-foreground">
          Wat verdiend is wordt uitgerekend uit wie wie heeft uitgenodigd; alleen wat je uitbetaalt
          wordt vastgelegd. Spelers zien hun eigen tegoed op /referral, deze pagina is van jou.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 text-sm">
        <p>
          <span className="font-medium">De regel:</span> de platformfee wordt{" "}
          {Math.round(CREDIT_SHARE_OF_FEE * 100)}/{100 - Math.round(CREDIT_SHARE_OF_FEE * 100)}{" "}
          gedeeld met wie de speler binnenbracht.
        </p>
        <p className="mt-2 text-muted-foreground">
          Bij 10% fee op €100 is dat €5 per geworven speler per maand dat hij meebetaalt — jij
          houdt de andere €5. Het kost dus nooit meer dan het opbracht, en een nepaccount kost
          €100 om €5 te verdienen.
        </p>
        <p className="mt-2 tabular-nums">
          Verdiend <span className="font-medium">€{euro.format(earned)}</span> · nog uit te betalen{" "}
          <span className="font-medium text-accent-brand">€{euro.format(outstanding)}</span>
        </p>
      </div>

      {earners.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nog niemand heeft tegoed opgebouwd — er is nog geen betaalde inleg van een uitgenodigde
          speler op een challenge met een fee.
        </p>
      ) : (
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">Uit te betalen</h2>
          {earners.map((row) => {
            const network = row.payoutNetwork ? getNetwork(row.payoutNetwork) : undefined;
            return (
              <div key={row.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium">{row.username}</p>
                  <p className="text-sm tabular-nums">
                    verdiend €{euro.format(row.credits.total)} · betaald €
                    {euro.format(row.credits.paidOut)} ·{" "}
                    <span className="font-medium text-accent-brand">
                      open €{euro.format(row.credits.outstanding)}
                    </span>
                  </p>
                </div>

                {row.payoutAddress ? (
                  <p className="mt-1 break-all text-xs text-muted-foreground">
                    {network ? `${network.label} (${network.standard})` : row.payoutNetwork} ·{" "}
                    <span className="font-mono">{row.payoutAddress}</span>
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-loss">
                    Nog geen uitbetaaladres — dat moet {row.username} eerst zelf invullen bij zijn
                    profiel.
                  </p>
                )}

                <ReferralPayoutForm
                  userId={row.id}
                  outstanding={row.credits.outstanding}
                  defaultNetwork={row.payoutNetwork}
                />
              </div>
            );
          })}
        </section>
      )}

      {payouts.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Al uitbetaald</h2>
          <div className="divide-y divide-border rounded-xl border border-border">
            {payouts.map((p) => {
              const url = p.network && p.txHash ? explorerTxUrl(p.network, p.txHash) : null;
              return (
                <div
                  key={p.id}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1 p-3 text-sm"
                >
                  <span className="font-medium">{nameById.get(p.userId) ?? "onbekend"}</span>
                  <span className="tabular-nums">€{euro.format(p.amount)}</span>
                  <span className="text-xs text-muted-foreground">
                    {p.network ? (getNetwork(p.network)?.label ?? p.network) : "—"} ·{" "}
                    {p.createdAt.toLocaleDateString("nl-NL")}
                  </span>
                  {url && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-accent-brand underline underline-offset-2"
                    >
                      bekijk op de chain
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/*
        Real data alone can't show what this looks like: September runs at a
        0% fee, so every honest number on this page is zero. This is made up,
        and says so, purely to judge the block with something in it.
      */}
      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          Rekenvoorbeeld — verzonnen cijfers, drie geworven spelers bij 10% fee
        </h2>
        <ReferralCredits credits={EXAMPLE} />
      </section>

      <div className="rounded-xl border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Waar je op moet letten</p>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          <li>
            Er wordt hier niets verstuurd. Jij stuurt de USDT zelf en legt hier vast dát het is
            gebeurd — je sleutel blijft buiten deze applicatie.
          </li>
          <li>
            Bij €5 per aanbreng zijn de netwerkkosten het probleem, niet het bedrag. Tron of
            Solana kost centen, Ethereum eet de hele commissie op. Sparen en per kwartaal betalen
            scheelt het meest.
          </li>
          <li>
            Spelers zien hun tegoed zelf op /referral en kunnen het niet opvragen — ze moeten het
            jou zeggen. Er is nog geen knop voor.
          </li>
          <li>
            Uitbetalen in geld is juridisch iets anders dan korting op de inleg. Dit is de stap
            richting een echt affiliateprogramma, met de vergunningsvraag die daarbij hoort.
          </li>
        </ul>
      </div>
    </div>
  );
}
