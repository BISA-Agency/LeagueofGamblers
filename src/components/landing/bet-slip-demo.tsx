"use client";

import { useMemo, useState } from "react";
import { Check, Ticket, Trophy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * A playable slice of the sportsbook, entirely client-side. Visitors build a
 * real combi and watch the payout move, without an account and without
 * touching the database — the point is to show how placing a bet feels
 * before anyone signs up.
 */

const BALANCE = 10000;

type Outcome = { id: string; label: string; odds: number };
type Match = { id: string; competition: string; home: string; away: string; outcomes: Outcome[] };

const MATCHES: Match[] = [
  {
    id: "m1",
    competition: "Eredivisie",
    home: "Ajax",
    away: "PSV",
    outcomes: [
      { id: "m1-h", label: "Ajax", odds: 2.4 },
      { id: "m1-d", label: "Gelijkspel", odds: 3.5 },
      { id: "m1-a", label: "PSV", odds: 2.75 },
    ],
  },
  {
    id: "m2",
    competition: "Premier League",
    home: "Arsenal",
    away: "Liverpool",
    outcomes: [
      { id: "m2-h", label: "Arsenal", odds: 2.6 },
      { id: "m2-d", label: "Gelijkspel", odds: 3.6 },
      { id: "m2-a", label: "Liverpool", odds: 2.5 },
    ],
  },
  {
    id: "m3",
    competition: "Champions League",
    home: "Sparta Praag",
    away: "Man City",
    outcomes: [
      { id: "m3-h", label: "Sparta Praag", odds: 23.0 },
      { id: "m3-d", label: "Gelijkspel", odds: 9.5 },
      { id: "m3-a", label: "Man City", odds: 1.08 },
    ],
  },
];

const STAKE_SHORTCUTS = [10, 25, 50];

const money = new Intl.NumberFormat("nl-NL", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function BetSlipDemo() {
  const [picks, setPicks] = useState<string[]>(["m1-h"]);
  const [stake, setStake] = useState(25);
  const [placed, setPlaced] = useState(false);

  const selected = useMemo(
    () =>
      MATCHES.flatMap((match) =>
        match.outcomes
          .filter((o) => picks.includes(o.id))
          .map((o) => ({ ...o, match }))
      ),
    [picks]
  );

  const totalOdds = selected.reduce((acc, s) => acc * s.odds, 1);
  const payout = stake * totalOdds;

  function toggle(match: Match, outcome: Outcome) {
    setPlaced(false);
    setPicks((current) => {
      if (current.includes(outcome.id)) return current.filter((id) => id !== outcome.id);
      // Same rule as the real bet slip: never two selections from one match.
      const withoutSameMatch = current.filter(
        (id) => !match.outcomes.some((o) => o.id === id)
      );
      return [...withoutSameMatch, outcome.id];
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-3">
        {MATCHES.map((match) => (
          <div key={match.id} className="rounded-lg border border-border bg-card p-3">
            <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Trophy className="size-3.5 shrink-0" />
              <span className="truncate">{match.competition}</span>
            </div>
            <p className="mb-3 text-sm font-medium">
              {match.home} <span className="text-muted-foreground">—</span> {match.away}
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {match.outcomes.map((outcome) => {
                const active = picks.includes(outcome.id);
                return (
                  <button
                    key={outcome.id}
                    type="button"
                    onClick={() => toggle(match, outcome)}
                    aria-pressed={active}
                    className={cn(
                      "flex h-14 flex-col items-center justify-center rounded-md border px-1 transition-colors",
                      active
                        ? "border-accent-brand bg-accent-brand/15"
                        : "border-border bg-secondary/40 hover:border-white/25"
                    )}
                  >
                    <span className="max-w-full truncate text-[11px] text-muted-foreground">
                      {outcome.label}
                    </span>
                    <span
                      className={cn(
                        "text-sm font-semibold tabular-nums",
                        active && "text-accent-brand"
                      )}
                    >
                      {outcome.odds.toFixed(2)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <p className="text-xs text-muted-foreground">
          Probeer maar: tik meerdere wedstrijden aan voor een combi. Twee selecties uit
          dezelfde wedstrijd kan niet — net als in de app.
        </p>
      </div>

      <div className="h-fit rounded-lg border border-border bg-card p-4 lg:sticky lg:top-24">
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Ticket className="size-4 text-accent-brand" />
            Bet slip
          </span>
          <span className="text-xs tabular-nums text-muted-foreground">
            Saldo €{BALANCE.toLocaleString("nl-NL")}
          </span>
        </div>

        {selected.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Tik een quotering aan om te beginnen.
          </p>
        ) : (
          <ul className="mb-3 space-y-2">
            {selected.map((s) => (
              <li key={s.id} className="flex items-start gap-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{s.label}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {s.match.home} — {s.match.away}
                  </p>
                </div>
                <span className="shrink-0 tabular-nums">{s.odds.toFixed(2)}</span>
                <button
                  type="button"
                  onClick={() => toggle(s.match, s)}
                  aria-label={`Verwijder ${s.label}`}
                  className="shrink-0 text-muted-foreground hover:text-loss"
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-2 border-t border-border pt-3">
          <div className="flex gap-1.5">
            {STAKE_SHORTCUTS.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => {
                  setStake(amount);
                  setPlaced(false);
                }}
                className={cn(
                  "h-9 flex-1 rounded-md border text-xs font-medium tabular-nums transition-colors",
                  stake === amount
                    ? "border-accent-brand text-accent-brand"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                €{amount}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setStake(BALANCE);
                setPlaced(false);
              }}
              className={cn(
                "h-9 flex-1 rounded-md border text-xs font-medium transition-colors",
                stake === BALANCE
                  ? "border-loss text-loss"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              All-in
            </button>
          </div>

          <dl className="space-y-1 pt-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Inzet</dt>
              <dd className="tabular-nums">€{money.format(stake)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Totale quotering</dt>
              <dd className="tabular-nums">{totalOdds.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <dt>Mogelijke winst</dt>
              <dd className="tabular-nums text-accent-brand">€{money.format(payout)}</dd>
            </div>
          </dl>

          <Button
            type="button"
            className="h-11 w-full"
            disabled={selected.length === 0}
            onClick={() => setPlaced(true)}
          >
            {placed ? (
              <>
                <Check className="size-4" /> Zo voelt dat
              </>
            ) : (
              "Plaats bet"
            )}
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">
            {placed
              ? "In de app was deze bet nu geplaatst en zag het hele veld 'm bij aftrap."
              : "Demo — er wordt niets geplaatst en je hebt geen account nodig."}
          </p>
        </div>
      </div>
    </div>
  );
}
