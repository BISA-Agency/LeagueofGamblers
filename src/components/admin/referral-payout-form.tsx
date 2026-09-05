"use client";

import { useActionState } from "react";
import { recordReferralPayout, type PayoutState } from "@/actions/admin/referral-payouts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NETWORKS } from "@/lib/payments/networks";

const EMPTY: PayoutState = {};

/**
 * Logs a transfer that has already left the wallet.
 *
 * Deliberately not a "pay" button: nothing here touches a chain. The admin
 * sends the USDT by hand and writes down what went where, which keeps the
 * private key out of this application entirely.
 */
export function ReferralPayoutForm({
  userId,
  outstanding,
  defaultNetwork,
}: {
  userId: string;
  outstanding: number;
  defaultNetwork: string | null;
}) {
  const [state, action, pending] = useActionState(recordReferralPayout, EMPTY);

  return (
    <form action={action} className="mt-3 space-y-2 border-t border-border pt-3">
      <input type="hidden" name="userId" value={userId} />
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-muted-foreground">
          Bedrag (€)
          <Input
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            max={outstanding}
            defaultValue={outstanding > 0 ? outstanding.toFixed(2) : ""}
            className="mt-1 h-10 w-28"
            required
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Netwerk
          <select
            name="network"
            defaultValue={defaultNetwork ?? "tron"}
            className="mt-1 h-10 rounded-md border border-input bg-transparent px-2 text-sm"
          >
            {NETWORKS.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label} ({n.standard})
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-40 flex-1 text-xs text-muted-foreground">
          Transactiehash
          <Input name="txHash" className="mt-1 h-10" placeholder="optioneel, maar wel zo netjes" />
        </label>
        <Button type="submit" size="sm" className="h-10" disabled={pending || outstanding <= 0}>
          {pending ? "Bezig…" : "Vastleggen"}
        </Button>
      </div>

      {state.error && <p className="text-xs text-loss">{state.error}</p>}
      {state.ok && <p className="text-xs text-profit">{state.ok}</p>}
    </form>
  );
}
