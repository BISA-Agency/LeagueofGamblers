"use client";

import { useActionState } from "react";
import { AlertTriangle, Check } from "lucide-react";
import { updatePayoutMethod, type PayoutState } from "@/actions/payout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NETWORKS } from "@/lib/payments/networks";
import { cn } from "@/lib/utils";

export function PayoutMethodForm({
  defaultNetwork,
  defaultAddress,
}: {
  defaultNetwork: string | null;
  defaultAddress: string | null;
}) {
  const [state, action, pending] = useActionState<PayoutState, FormData>(updatePayoutMethod, {});

  return (
    <form action={action} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="payoutNetwork">Netwerk</Label>
        <select
          id="payoutNetwork"
          name="payoutNetwork"
          defaultValue={defaultNetwork ?? ""}
          className="h-11 w-full rounded-md border border-border bg-transparent px-3 text-sm"
        >
          <option value="">Geen</option>
          {NETWORKS.map((n) => (
            <option key={n.id} value={n.id}>
              {n.label} ({n.standard})
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="payoutAddress">USDT-adres</Label>
        <Input
          id="payoutAddress"
          name="payoutAddress"
          defaultValue={defaultAddress ?? ""}
          placeholder="Plak hier je wallet-adres"
          className="font-mono text-xs"
        />
        <p className="text-[11px] text-muted-foreground">
          Het adres wordt gecontroleerd op geldigheid voordat het wordt opgeslagen. Prijzengeld
          gaat hier naartoe, dus controleer of het netwerk klopt met je wallet.
        </p>
      </div>

      {state.error && (
        <p className="flex items-start gap-1.5 text-xs text-loss">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="flex items-center gap-1.5 text-xs text-profit">
          <Check className="size-3.5" />
          Opgeslagen.
        </p>
      )}

      <Button type="submit" variant="outline" disabled={pending} className={cn("h-11")}>
        {pending ? "Bezig…" : "Uitbetaalmethode opslaan"}
      </Button>
    </form>
  );
}
