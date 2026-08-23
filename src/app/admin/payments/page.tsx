import { asc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { explorerTxUrl, getNetwork } from "@/lib/payments/networks";
import { payments } from "@drizzle/schema";
import { EmailStatus } from "@/components/admin/email-status";
import { quoteUsdt } from "@/lib/payments/rate";
import { PayoutCard, type Payout } from "./payout-card";
import { BuyInClaimCard, type BuyInClaim } from "./buy-in-claim";

export const metadata: Metadata = { title: "Pot & betalingen" };

const DIRECTION_LABEL: Record<string, string> = {
  buy_in: "inleg",
  payout_mission: "missie-uitkering",
  payout_prize: "prijzengeld",
  refund: "terugbetaling",
};

export default async function AdminPaymentsPage() {
  const [allChallenges, pendingPayments] = await Promise.all([
    db.query.challenges.findMany({
      with: { participants: true },
    }),
    db.query.payments.findMany({
      where: eq(payments.status, "pending"),
      orderBy: asc(payments.createdAt),
      with: { user: true, challenge: true },
    }),
  ]);

  // Money coming IN needs verifying against a chain; money going OUT just
  // needs ticking off. They are different jobs, so they are different lists.
  const claims: BuyInClaim[] = pendingPayments
    .filter((p) => p.direction === "buy_in" && p.provider === "crypto")
    .map((p) => ({
      id: p.id,
      username: p.user.username,
      challengeName: p.challenge.name,
      amount: p.amount,
      feeAmount: p.feeAmount,
      tokenAmount: p.tokenAmount,
      network: p.network,
      networkLabel: p.network
        ? `${getNetwork(p.network)?.label ?? p.network} ${getNetwork(p.network)?.standard ?? ""}`.trim()
        : "Onbekend netwerk",
      txHash: p.txHash,
      explorerUrl: p.network && p.txHash ? explorerTxUrl(p.network, p.txHash) : null,
      hasScreenshot: Boolean(p.screenshotUrl),
      submittedAt: p.createdAt,
    }));

  // One rate for the whole page: every payout is converted with the same
  // number, so the column adds up to what the totals say.
  const { rate } = await quoteUsdt(1);

  const outgoing: Payout[] = pendingPayments
    .filter((p) => !(p.direction === "buy_in" && p.provider === "crypto"))
    .map((p) => {
      const network = p.user.payoutNetwork ? getNetwork(p.user.payoutNetwork) : undefined;
      // The rank lives in the reference ("Prijs #2 — ..."), not in a column.
      // No match simply means no badge, which is right for a mission payout.
      const place = Number(/#(\d+)/.exec(p.reference ?? "")?.[1]);
      return {
        id: p.id,
        username: p.user.username,
        challengeName: p.challenge.name,
        kind: DIRECTION_LABEL[p.direction] ?? p.direction,
        amount: p.amount,
        tokenAmount: rate > 0 ? Math.round(p.amount * rate * 100) / 100 : null,
        place: Number.isFinite(place) ? place : null,
        network: p.user.payoutNetwork,
        networkLabel: network ? `${network.label} (${network.standard})` : null,
        address: p.user.payoutAddress,
      };
    });

  const feeRevenue = (
    await db.query.payments.findMany({
      where: eq(payments.status, "confirmed"),
      columns: { feeAmount: true },
    })
  ).reduce((sum, p) => sum + p.feeAmount, 0);

  const potsByChallenge = allChallenges
    .filter((c) => c.status !== "draft")
    .map((c) => {
      const paidCount = c.participants.filter((p) => p.paidBuyIn).length;
      return { challenge: c, paidCount, pot: paidCount * c.buyInAmount };
    });

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold tracking-tight">Pot & betalingen</h1>

      <EmailStatus />

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Pot per challenge</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {potsByChallenge.map(({ challenge, paidCount, pot }) => (
            <Card key={challenge.id}>
              <CardHeader>
                <CardTitle className="text-sm">{challenge.name}</CardTitle>
                <CardDescription className="tabular-nums">
                  {paidCount} betaald × €{challenge.buyInAmount} = €{pot.toLocaleString("nl-NL")}
                  {challenge.platformFeePercent > 0 && (
                    <>
                      <br />
                      {challenge.platformFeePercent}% servicekosten bovenop de inleg
                    </>
                  )}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Te controleren inleg ({claims.length})
          </h2>
          <p className="text-xs tabular-nums text-muted-foreground">
            Servicekosten ontvangen:{" "}
            <span className="font-medium text-profit">
              €{feeRevenue.toLocaleString("nl-NL")}
            </span>
          </p>
        </div>
        {claims.length === 0 && (
          <p className="text-sm text-muted-foreground">Geen betalingen om te controleren.</p>
        )}
        <div className="space-y-2">
          {claims.map((claim) => (
            <BuyInClaimCard key={claim.id} claim={claim} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Openstaande uitbetalingen ({outgoing.length})
        </h2>
        {outgoing.length === 0 && (
          <p className="text-sm text-muted-foreground">Niets te betalen.</p>
        )}
        <div className="space-y-2">
          {outgoing.map((payout) => (
            <PayoutCard key={payout.id} payout={payout} />
          ))}
        </div>
      </section>
    </div>
  );
}
