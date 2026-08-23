"use client";

import { useState } from "react";
import { calculatePrizeSplit, type PrizeTierRow } from "@/lib/settlement/payouts";
import { cn } from "@/lib/utils";

/**
 * Uses the app's own calculatePrizeSplit, so the number a visitor sees here is
 * the number the app will pay out — this can't drift from the real staffel.
 *
 * The two tiers below are the ones that ship in the database, and they cover
 * small fields; above fifteen the same function falls through to the formula,
 * so dragging the slider up shows exactly what a big challenge would pay.
 */
const DEFAULT_TIERS: PrizeTierRow[] = [
  { minPlayers: 2, maxPlayers: 6, split: [{ rank: 1, percent: 100 }] },
  {
    minPlayers: 7,
    maxPlayers: 15,
    split: [
      { rank: 1, percent: 50 },
      { rank: 2, percent: 30 },
      { rank: 3, percent: 20 },
    ],
  },
];

const BUY_INS = [10, 25, 50, 100];
const RANK_LABEL = ["Winnaar", "Tweede", "Derde"];
const MAX_PLAYERS = 100;

export function PotCalculator() {
  const [players, setPlayers] = useState(8);
  const [buyIn, setBuyIn] = useState(25);

  const pot = players * buyIn;
  const split = calculatePrizeSplit(players, pot, DEFAULT_TIERS);
  const deeper = split.slice(3);
  const smallest = split[split.length - 1]?.amount ?? 0;

  return (
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <label htmlFor="players" className="text-sm font-medium">
              Aantal spelers
            </label>
            <span className="text-lg font-semibold tabular-nums text-accent-brand">{players}</span>
          </div>
          <input
            id="players"
            type="range"
            min={2}
            max={MAX_PLAYERS}
            value={players}
            onChange={(e) => setPlayers(Number(e.target.value))}
            className="h-11 w-full accent-[var(--accent-brand)]"
          />
        </div>

        <div className="space-y-2">
          <span className="block text-sm font-medium">Inleg per speler</span>
          <div className="flex gap-1.5">
            {BUY_INS.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setBuyIn(amount)}
                className={cn(
                  "h-11 flex-1 rounded-md border text-sm font-medium tabular-nums transition-colors",
                  buyIn === amount
                    ? "border-accent-brand bg-accent-brand/15 text-accent-brand"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                €{amount}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-lg bg-secondary/40 p-5 text-center">
        <p className="text-sm text-muted-foreground">Totale pot</p>
        <p className="text-4xl font-semibold tabular-nums text-accent-brand sm:text-5xl">
          €{pot.toLocaleString("nl-NL")}
        </p>
      </div>

      {/* Only the podium is spelled out. Past three places a grid of twenty
          boxes stops being a selling point and starts being a spreadsheet. */}
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {split.slice(0, 3).map((entry) => (
          <div key={entry.rank} className="rounded-lg border border-border p-3 text-center">
            <p className="text-xs text-muted-foreground">
              {RANK_LABEL[entry.rank - 1] ?? `#${entry.rank}`}
            </p>
            <p className="text-xl font-semibold tabular-nums">
              €{entry.amount.toLocaleString("nl-NL")}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        {deeper.length > 0 ? (
          <>
            En nog {deeper.length} {deeper.length === 1 ? "plek" : "plekken"} in de prijzen, tot en
            met #{split.length} voor €{smallest.toLocaleString("nl-NL")}. Hoe groter het veld, hoe
            meer spelers er iets meenemen.
          </>
        ) : (
          "Tot en met zes spelers pakt de winnaar de hele pot."
        )}{" "}
        De organisator kan de verdeling per challenge aanpassen.
      </p>
    </div>
  );
}
