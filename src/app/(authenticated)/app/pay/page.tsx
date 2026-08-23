import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { Check, ChevronRight, Clock, X } from "lucide-react";
import { db } from "@/lib/db";
import { totalWithFee } from "@/lib/payments/rate";
import { challengeParticipants, payments } from "@drizzle/schema";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Inleg" };

const money = (n: number) =>
  n.toLocaleString("nl-NL", {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });

export default async function PayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [participations, myPayments] = await Promise.all([
    db.query.challengeParticipants.findMany({
      where: eq(challengeParticipants.userId, user.id),
      with: { challenge: true },
    }),
    db.query.payments.findMany({
      where: eq(payments.userId, user.id),
      orderBy: desc(payments.createdAt),
    }),
  ]);

  const latestByChallenge = new Map<string, (typeof myPayments)[number]>();
  for (const p of myPayments) {
    if (!latestByChallenge.has(p.challengeId)) latestByChallenge.set(p.challengeId, p);
  }

  const sorted = [...participations].sort(
    (a, b) => Number(a.paidBuyIn) - Number(b.paidBuyIn)
  );

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Inleg</h1>
        <p className="text-sm text-muted-foreground">
          Betalen gaat met USDT. Je doet mee zodra de betaling is teruggevonden op de blockchain.
        </p>
      </div>

      {sorted.length === 0 && (
        <p className="text-sm text-muted-foreground">Je doet nog niet mee aan een challenge.</p>
      )}

      <div className="space-y-2">
        {sorted.map((p) => {
          const { total } = totalWithFee(p.challenge.buyInAmount, p.challenge.platformFeePercent);
          const latest = latestByChallenge.get(p.challengeId);
          const pending = !p.paidBuyIn && latest?.status === "pending";
          const rejected = !p.paidBuyIn && latest?.status === "rejected";

          return (
            <Link
              key={p.challengeId}
              href={`/app/pay/${p.challengeId}`}
              className="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-secondary/40"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.challenge.name}</p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  &euro;{money(total)}
                  {p.challenge.platformFeePercent > 0 &&
                    ` · incl. ${p.challenge.platformFeePercent}% servicekosten`}
                </p>
              </div>

              {p.paidBuyIn ? (
                <span className="flex shrink-0 items-center gap-1 text-xs text-profit">
                  <Check className="size-3.5" /> Betaald
                </span>
              ) : pending ? (
                <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="size-3.5" /> In controle
                </span>
              ) : rejected ? (
                <span className="flex shrink-0 items-center gap-1 text-xs text-loss">
                  <X className="size-3.5" /> Afgekeurd
                </span>
              ) : (
                <span className="shrink-0 text-xs text-accent-brand">Betalen</span>
              )}
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
