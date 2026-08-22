"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { placeSportsbookBet } from "@/actions/bets";
import { useBetSlip } from "@/lib/betslip/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const QUICK_PERCENTAGES = [10, 25, 50];

const oddsFormatter = new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const moneyFormatter = new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function BetSlipContent({
  challengeId,
  balance,
  onPlaced,
}: {
  challengeId: string;
  balance: number;
  onPlaced?: () => void;
}) {
  const { selections, removeSelection, clear } = useBetSlip();
  const [stake, setStake] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const totalOdds = selections.reduce((acc, s) => acc * s.odds, 1);
  const stakeValue = Number(stake.replace(",", "."));
  const validStake = Number.isFinite(stakeValue) && stakeValue > 0;
  const potentialPayout = validStake ? stakeValue * totalOdds : 0;
  const balanceAfter = validStake ? balance - stakeValue : balance;

  function setStakeFromPercent(percent: number) {
    setStake((Math.floor(balance * (percent / 100) * 100) / 100).toString());
  }

  function handlePlace() {
    setError(null);
    if (selections.length === 0) {
      setError("Kies eerst een selectie.");
      return;
    }
    if (!validStake) {
      setError("Vul een geldige inzet in.");
      return;
    }
    if (stakeValue > balance) {
      setError("Je inzet is hoger dan je saldo.");
      return;
    }

    startTransition(async () => {
      const result = await placeSportsbookBet(
        challengeId,
        selections.map((s) => s.outcomeId),
        stakeValue
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      clear();
      setStake("");
      onPlaced?.();
    });
  }

  if (selections.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Tik op een quotering om een selectie toe te voegen.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {selections.map((s) => (
          <div key={s.outcomeId} className="flex items-start justify-between gap-2 rounded-md border border-border p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{s.selectionLabel}</p>
              <p className="truncate text-xs text-muted-foreground">
                {s.eventName} · {s.marketLabel}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="tabular-nums text-sm font-medium">{oddsFormatter.format(s.odds)}</span>
              <button
                type="button"
                onClick={() => removeSelection(s.outcomeId)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Verwijder selectie"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {selections.length > 1 && (
        <p className="text-sm text-muted-foreground">
          Combi · totale odds{" "}
          <span className="tabular-nums font-medium text-foreground">{oddsFormatter.format(totalOdds)}</span>
        </p>
      )}

      <div className="space-y-2">
        <Input
          type="text"
          inputMode="decimal"
          placeholder="Inzet (€)"
          value={stake}
          onChange={(e) => setStake(e.target.value)}
          className="h-11 tabular-nums"
        />
        <div className="flex gap-2">
          {QUICK_PERCENTAGES.map((p) => (
            <Button key={p} type="button" variant="outline" size="sm" className="h-9 flex-1" onClick={() => setStakeFromPercent(p)}>
              {p}%
            </Button>
          ))}
          <Button type="button" variant="outline" size="sm" className="h-9 flex-1" onClick={() => setStakeFromPercent(100)}>
            All-in
          </Button>
        </div>
      </div>

      <dl className="space-y-1 text-sm tabular-nums">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Potentiële winst</dt>
          <dd className="font-medium text-profit">€{moneyFormatter.format(potentialPayout)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Saldo na plaatsen</dt>
          <dd className={balanceAfter < 0 ? "text-loss" : ""}>€{moneyFormatter.format(balanceAfter)}</dd>
        </div>
      </dl>

      {error && (
        <p role="alert" className="text-sm text-loss">
          {error}
        </p>
      )}

      <Button type="button" className="h-11 w-full" disabled={pending} onClick={handlePlace}>
        {pending ? "Bezig…" : "Plaats bet"}
      </Button>
    </div>
  );
}
