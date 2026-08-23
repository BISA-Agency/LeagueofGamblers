"use client";

import { useState, useTransition } from "react";
import { ExternalLink, Eye } from "lucide-react";
import {
  approveCryptoBuyIn,
  getPaymentScreenshotUrl,
  rejectCryptoBuyIn,
} from "@/actions/admin/payments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type BuyInClaim = {
  id: string;
  username: string;
  challengeName: string;
  amount: number;
  feeAmount: number;
  tokenAmount: number | null;
  network: string | null;
  networkLabel: string;
  txHash: string | null;
  explorerUrl: string | null;
  hasScreenshot: boolean;
  submittedAt: Date;
};

const submitted = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Amsterdam",
});

/**
 * The chain is the evidence, so the transaction link is the primary control
 * here — the screenshot is a second opinion, loaded on demand rather than
 * dumped into the page for every pending claim.
 */
export function BuyInClaimCard({ claim }: { claim: BuyInClaim }) {
  const [pending, startTransition] = useTransition();
  const [shot, setShot] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {claim.username} · {claim.challengeName}
          </p>
          <p className="text-xs tabular-nums text-muted-foreground">
            €{claim.amount.toLocaleString("nl-NL")} inleg
            {claim.feeAmount > 0 && ` + €${claim.feeAmount.toLocaleString("nl-NL")} fee`}
            {claim.tokenAmount !== null && ` · verwacht ${claim.tokenAmount.toFixed(2)} USDT`}
          </p>
        </div>
        <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
          {submitted.format(claim.submittedAt)}
        </span>
      </div>

      <div className="space-y-1 rounded-md border border-border bg-secondary/30 p-2.5">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {claim.networkLabel}
        </p>
        <p className="break-all font-mono text-xs">{claim.txHash}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {claim.explorerUrl && (
          <Button asChild size="sm" variant="outline" className="h-10">
            <a href={claim.explorerUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="size-3.5" />
              Bekijk op de chain
            </a>
          </Button>
        )}
        {claim.hasScreenshot && (
          <Button
            size="sm"
            variant="outline"
            className="h-10"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setShot(await getPaymentScreenshotUrl(claim.id));
              })
            }
          >
            <Eye className="size-3.5" />
            Screenshot
          </Button>
        )}
      </div>

      {shot && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={shot}
          alt="Screenshot van de transactie"
          className="w-full rounded-md border border-border"
        />
      )}

      {error && <p className="text-xs text-loss">{error}</p>}

      <div className="flex gap-2">
        <Button
          size="sm"
          className="h-10 flex-1"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              try {
                await approveCryptoBuyIn(claim.id);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Goedkeuren mislukt.");
              }
            })
          }
        >
          Goedkeuren
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-10 flex-1"
          disabled={pending}
          onClick={() => setRejecting((v) => !v)}
        >
          Afkeuren
        </Button>
      </div>

      {rejecting && (
        <form action={rejectCryptoBuyIn.bind(null, claim.id)} className="flex gap-2">
          <Input name="reason" placeholder="Reden (de speler ziet dit)" className="h-10" />
          <Button type="submit" size="sm" variant="outline" className="h-10">
            Afkeuren
          </Button>
        </form>
      )}
    </div>
  );
}
