import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { CashProvider } from "@/lib/payment-provider/cash";
import { challengeParticipants } from "@drizzle/schema";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Inleg" };

export default async function PayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const participations = await db.query.challengeParticipants.findMany({
    where: eq(challengeParticipants.userId, user.id),
    with: { challenge: true },
  });

  const provider = new CashProvider();

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-6">
      <h1 className="text-xl font-semibold tracking-tight">Inleg</h1>

      {participations.length === 0 && (
        <p className="text-sm text-muted-foreground">Je doet nog niet mee aan een challenge.</p>
      )}

      <div className="space-y-3">
        {await Promise.all(
          participations.map(async (p) => {
            const request = await provider.createPaymentRequest({
              amount: p.challenge.buyInAmount,
              currency: p.challenge.currency,
              challengeId: p.challengeId,
              userId: user.id,
            });
            return (
              <div key={p.challengeId} className="rounded-lg border border-border p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{p.challenge.name}</p>
                  {p.paidBuyIn ? (
                    <Badge className="border-profit/30 bg-profit/15 text-profit">Betaald</Badge>
                  ) : (
                    <Badge variant="secondary">Nog niet betaald</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{request.instructions}</p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
