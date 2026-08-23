import { asc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { confirmPayment } from "@/actions/admin/payments";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { explorerTxUrl, getNetwork } from "@/lib/payments/networks";
import { payments } from "@drizzle/schema";
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

  const outgoing = pendingPayments.filter(
    (p) => !(p.direction === "buy_in" && p.provider === "crypto")
  );

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
          {outgoing.map((payment) => (
            <div
              key={payment.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border p-4"
            >
              <div>
                <p className="text-sm font-medium">
                  {payment.user.username} · €{payment.amount.toLocaleString("nl-NL")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {payment.challenge.name} ·{" "}
                  {DIRECTION_LABEL[payment.direction] ?? payment.direction}
                  {payment.reference && ` · ${payment.reference}`}
                </p>
              </div>
              <form action={confirmPayment.bind(null, payment.id)}>
                <Button type="submit" size="sm" variant="outline" className="h-11">
                  Markeer betaald
                </Button>
              </form>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
