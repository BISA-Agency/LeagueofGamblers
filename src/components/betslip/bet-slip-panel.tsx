"use client";

import { BetSlipContent } from "./bet-slip-content";

export function BetSlipPanel({ challengeId, balance }: { challengeId: string; balance: number }) {
  return (
    <aside className="hidden w-80 shrink-0 border-l border-border p-4 md:block">
      <h2 className="mb-4 text-sm font-medium text-muted-foreground">Bet slip</h2>
      <BetSlipContent challengeId={challengeId} balance={balance} />
    </aside>
  );
}
