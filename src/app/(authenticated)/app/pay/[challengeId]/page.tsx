import { and, desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AlertTriangle, ArrowLeft, Check, Clock, X } from "lucide-react";
import QRCode from "qrcode";
import { CopyField } from "@/components/payments/copy-field";
import { NetworkPicker } from "@/components/payments/network-picker";
import { PaymentClaimForm } from "@/components/payments/payment-claim-form";
import { db } from "@/lib/db";
import { explorerTxUrl, getNetwork, NETWORKS } from "@/lib/payments/networks";
import { quoteUsdt, totalWithFee } from "@/lib/payments/rate";
import { challengeParticipants, payments } from "@drizzle/schema";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Inleg betalen" };

const money = (n: number) =>
  n.toLocaleString("nl-NL", {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });

export default async function PayChallengePage({
  params,
  searchParams,
}: {
  params: Promise<{ challengeId: string }>;
  searchParams: Promise<{ n?: string }>;
}) {
  const { challengeId } = await params;
  const { n } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const participation = await db.query.challengeParticipants.findFirst({
    where: and(
      eq(challengeParticipants.challengeId, challengeId),
      eq(challengeParticipants.userId, user.id)
    ),
    with: { challenge: true },
  });
  if (!participation) notFound();

  const challenge = participation.challenge;
  const { fee, total } = totalWithFee(challenge.buyInAmount, challenge.platformFeePercent);

  const latest = await db.query.payments.findFirst({
    where: and(eq(payments.challengeId, challengeId), eq(payments.userId, user.id)),
    orderBy: desc(payments.createdAt),
  });

  const network = getNetwork(n ?? "") ?? NETWORKS[0];
  const quote = await quoteUsdt(total);
  const qr = await QRCode.toString(network.address, {
    type: "svg",
    margin: 1,
    color: { dark: "#e8e8e8", light: "#00000000" },
  });

  const done = participation.paidBuyIn;
  const waiting = !done && latest?.status === "pending";
  const rejected = !done && latest?.status === "rejected";
  const explorer =
    latest?.txHash && latest.network ? explorerTxUrl(latest.network, latest.txHash) : null;

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-6">
      <Link
        href="/app/pay"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Inleg
      </Link>

      <div>
        <h1 className="text-xl font-semibold tracking-tight">Inleg betalen</h1>
        <p className="text-sm text-muted-foreground">{challenge.name}</p>
      </div>

      {/* The ledger first: what is owed and why, before any addresses. */}
      <dl className="space-y-1.5 rounded-lg border border-border p-4 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Inleg (gaat in de pot)</dt>
          <dd className="tabular-nums">&euro;{money(challenge.buyInAmount)}</dd>
        </div>
        {fee > 0 && (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">
              Servicekosten {challenge.platformFeePercent}%
            </dt>
            <dd className="tabular-nums">&euro;{money(fee)}</dd>
          </div>
        )}
        <div className="flex justify-between gap-3 border-t border-dashed border-border pt-1.5">
          <dt className="font-medium">Te betalen</dt>
          <dd className="text-base font-semibold tabular-nums">&euro;{money(total)}</dd>
        </div>
      </dl>

      {done ? (
        <p className="flex items-center gap-2 rounded-lg border border-profit/30 bg-profit/10 p-4 text-sm text-profit">
          <Check className="size-4 shrink-0" />
          Je inleg is bevestigd. Je doet mee.
        </p>
      ) : waiting ? (
        <div className="space-y-2 rounded-lg border border-border p-4">
          <p className="flex items-center gap-2 text-sm">
            <Clock className="size-4 shrink-0 text-muted-foreground" />
            Je betaling is ingediend en wordt gecontroleerd.
          </p>
          {latest?.txHash && latest.network && (
            <p className="break-all text-[11px] text-muted-foreground">
              {getNetwork(latest.network)?.label} · {latest.txHash}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Zodra de transactie op de blockchain is teruggevonden, sta je in de challenge.
          </p>
        </div>
      ) : (
        <>
          {rejected && (
            <p className="flex items-start gap-2 rounded-lg border border-loss/30 bg-loss/10 p-3 text-sm text-loss">
              <X className="mt-0.5 size-4 shrink-0" />
              <span>
                Je vorige betaling is afgekeurd
                {latest?.reference ? `: ${latest.reference}` : ""}. Dien de betaling opnieuw in.
              </span>
            </p>
          )}

          <section className="space-y-2">
            <h2 className="text-sm font-medium">1 &middot; Kies een netwerk</h2>
            <NetworkPicker challengeId={challengeId} active={network.id} />
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-medium">2 &middot; Stuur USDT</h2>

            {/* The single most expensive mistake in crypto payments, so it sits
                above the address rather than in a footnote below it. */}
            <p className="flex items-start gap-2 rounded-lg border border-loss/40 bg-loss/10 p-3 text-xs text-loss">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>
                Stuur alleen{" "}
                <strong>
                  USDT via {network.label} ({network.standard})
                </strong>
                . USDT op een ander netwerk naar dit adres sturen betekent dat het geld weg is en
                niet terug te halen.
              </span>
            </p>

            <CopyField label="Bedrag (USDT)" value={quote.tokenAmount.toFixed(2)} />
            <CopyField
              label={`Adres · ${network.label} ${network.standard}`}
              value={network.address}
            />

            <div className="flex justify-center rounded-lg border border-border bg-secondary/30 p-4">
              <div
                className="size-40 [&>svg]:size-full"
                dangerouslySetInnerHTML={{ __html: qr }}
                aria-label={`QR-code met het ${network.label}-adres`}
                role="img"
              />
            </div>

            <p className="text-[11px] text-muted-foreground">
              &euro;{money(total)} &times; {quote.rate.toFixed(4)} USD/EUR ={" "}
              {quote.tokenAmount.toFixed(2)} USDT.{" "}
              {quote.stale
                ? "Live koers niet bereikbaar — een klein verschil is geen probleem."
                : "Een klein verschil door koersbeweging of netwerkkosten is geen probleem."}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-medium">3 &middot; Meld je betaling</h2>
            <PaymentClaimForm
              challengeId={challengeId}
              networkId={network.id}
              networkLabel={`${network.label} (${network.standard})`}
            />
          </section>
        </>
      )}

      {explorer && (
        <a
          href={explorer}
          target="_blank"
          rel="noreferrer"
          className="block text-center text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Bekijk je transactie op de blockchain
        </a>
      )}
    </div>
  );
}
