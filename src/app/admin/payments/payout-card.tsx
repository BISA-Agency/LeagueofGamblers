"use client";

import { useState } from "react";
import { AlertTriangle, Check, Copy } from "lucide-react";
import { confirmPayment } from "@/actions/admin/payments";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type Payout = {
  id: string;
  username: string;
  challengeName: string;
  /** "prijzengeld", "missie-uitkering", … */
  kind: string;
  amount: number;
  /** Converted at the rate the page was rendered with; null when unavailable. */
  tokenAmount: number | null;
  /** Rank, when the reference carries one. */
  place: number | null;
  network: string | null;
  networkLabel: string | null;
  address: string | null;
};

const money = (n: number) =>
  n.toLocaleString("nl-NL", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/**
 * Everything needed to actually send the money, on one card.
 *
 * The old row named the player and the amount and stopped there — the address
 * was not on this page, and not on anyone else's profile either, since the
 * payout panel only ever shows your own. So the list said what was owed while
 * leaving out the one thing you need to pay it.
 */
export function PayoutCard({ payout }: { payout: Payout }) {
  const [copied, setCopied] = useState(false);
  const payable = Boolean(payout.address && payout.network);

  return (
    <div
      className={cn(
        "space-y-3 rounded-lg border p-4",
        payable ? "border-border" : "border-loss/30 bg-loss/5"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {payout.place !== null && (
              <span className="mr-1.5 text-muted-foreground">#{payout.place}</span>
            )}
            {payout.username}
          </p>
          <p className="text-xs text-muted-foreground">
            {payout.challengeName} · {payout.kind}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-base font-semibold tabular-nums">€{money(payout.amount)}</p>
          {payout.tokenAmount !== null && (
            <p className="text-[11px] tabular-nums text-muted-foreground">
              ≈ {payout.tokenAmount.toFixed(2)} USDT
            </p>
          )}
        </div>
      </div>

      {payable ? (
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {payout.networkLabel}
          </p>
          <div className="flex items-stretch gap-1.5">
            <code className="min-w-0 flex-1 break-all rounded-md border border-border bg-secondary/40 px-2.5 py-2 font-mono text-xs">
              {payout.address}
            </code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(payout.address!).then(
                  () => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1800);
                  },
                  () => setCopied(false)
                );
              }}
              aria-label="Adres kopiëren"
              className={cn(
                "flex w-11 shrink-0 items-center justify-center rounded-md border transition-colors",
                copied
                  ? "border-profit/40 bg-profit/15 text-profit"
                  : "border-border hover:bg-secondary/60"
              )}
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </button>
          </div>
        </div>
      ) : (
        // Not a disabled button: there is nothing to retry here, the player
        // has to fill something in first.
        <p className="flex items-start gap-1.5 text-xs text-loss">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          Geen uitbetaaladres ingevuld. Vraag {payout.username} dit toe te voegen onder Profiel →
          bewerken voordat je uitbetaalt.
        </p>
      )}

      <form action={confirmPayment.bind(null, payout.id)}>
        <Button
          type="submit"
          size="sm"
          variant="outline"
          className="h-11 w-full"
          disabled={!payable}
        >
          Markeer betaald
        </Button>
      </form>
    </div>
  );
}
