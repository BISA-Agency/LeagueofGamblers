import { asc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { confirmPayment } from "@/actions/admin/payments";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { payments } from "@drizzle/schema";

export const metadata: Metadata = { title: "Pot & betalingen" };

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
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Te betalen missie-uitkeringen ({pendingPayments.length})
        </h2>
        {pendingPayments.length === 0 && (
          <p className="text-sm text-muted-foreground">Niets te betalen.</p>
        )}
        <div className="space-y-2">
          {pendingPayments.map((payment) => (
            <div
              key={payment.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border p-4"
            >
              <div>
                <p className="text-sm font-medium">
                  {payment.user.username} · €{payment.amount.toLocaleString("nl-NL")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {payment.challenge.name} · {payment.direction}
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
