"use client";

import { useActionState } from "react";
import { AlertTriangle, Upload } from "lucide-react";
import { submitCryptoPayment, type CryptoPaymentState } from "@/actions/payments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TxidHelp } from "./txid-help";

export function PaymentClaimForm({
  challengeId,
  networkId,
  networkLabel,
}: {
  challengeId: string;
  networkId: string;
  networkLabel: string;
}) {
  const [state, action, pending] = useActionState<CryptoPaymentState, FormData>(
    submitCryptoPayment.bind(null, challengeId),
    {}
  );

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="network" value={networkId} />

      <div className="space-y-1.5">
        <div className="flex items-center gap-1">
          <Label htmlFor="txHash">Transactiehash</Label>
          <TxidHelp />
        </div>
        <Input id="txHash" name="txHash" required placeholder="Plak hier de hash van je transactie" />
        <p className="text-[11px] text-muted-foreground">
          Te vinden in je wallet of op je exchange, bij de verzonden transactie. Hiermee kan ik je
          betaling op {networkLabel} zelf terugvinden.
        </p>
        {state.fieldErrors?.txHash && (
          <p className="text-xs text-loss">{state.fieldErrors.txHash}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="screenshot">Screenshot van de transactie</Label>
        <Input
          id="screenshot"
          name="screenshot"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          required
        />
        {state.fieldErrors?.screenshot && (
          <p className="text-xs text-loss">{state.fieldErrors.screenshot}</p>
        )}
      </div>

      {state.error && (
        <p className="flex items-start gap-1.5 text-xs text-loss">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="h-11 w-full">
        <Upload className="size-4" />
        {pending ? "Bezig…" : "Ik heb betaald"}
      </Button>
    </form>
  );
}
