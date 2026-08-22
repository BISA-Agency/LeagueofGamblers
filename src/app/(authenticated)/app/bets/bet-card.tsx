"use client";

import { useState, useTransition } from "react";
import { settleProofBetSelf } from "@/actions/proof-bets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Bet, BetSelection } from "@drizzle/schema";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  open: { label: "Open", className: "" },
  won: { label: "Gewonnen", className: "border-profit/30 bg-profit/15 text-profit" },
  lost: { label: "Verloren", className: "border-loss/30 bg-loss/15 text-loss" },
  void: { label: "Void", className: "" },
  half_won: { label: "Half gewonnen", className: "border-profit/30 bg-profit/15 text-profit" },
  half_lost: { label: "Half verloren", className: "border-loss/30 bg-loss/15 text-loss" },
};

const VERIFICATION_LABEL: Record<string, string> = {
  pending: "⏳ ongecontroleerd",
  approved: "✓ goedgekeurd",
  rejected: "✗ afgekeurd",
};

const dateFormatter = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Amsterdam",
});

export function BetCard({ bet }: { bet: Bet & { selections: BetSelection[] } }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const canSelfSettle = bet.kind === "proof" && bet.status === "open" && bet.eventStart <= new Date();

  function settle(status: "won" | "lost" | "void") {
    setError(null);
    startTransition(async () => {
      try {
        await settleProofBetSelf(bet.id, status);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Settelen mislukt.");
      }
    });
  }

  const status = STATUS_LABEL[bet.status];

  return (
    <Card>
      <CardHeader className="gap-1">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">
            {bet.kind === "proof" ? "Bewijsbet" : "Sportsbook"} · {bet.type === "combi" ? "Combi" : "Single"}
          </CardTitle>
          <Badge variant="secondary" className={status.className}>
            {status.label}
          </Badge>
        </div>
        <CardDescription className="tabular-nums">
          Inzet €{bet.stake.toLocaleString("nl-NL")} · odds {bet.totalOdds.toFixed(2)} · potentieel €
          {bet.potentialPayout.toLocaleString("nl-NL")}
          {bet.kind === "proof" && ` · ${VERIFICATION_LABEL[bet.verificationStatus]}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {bet.selections.map((s) => (
          <p key={s.id} className="text-xs text-muted-foreground">
            {s.eventName} — {s.selectionLabel} ({s.odds.toFixed(2)}) · {dateFormatter.format(s.eventStart)}
          </p>
        ))}
      </CardContent>
      {canSelfSettle && (
        <div className="space-y-2 px-4 pb-4">
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-9 flex-1" disabled={pending} onClick={() => settle("won")}>
              Gewonnen
            </Button>
            <Button size="sm" variant="outline" className="h-9 flex-1" disabled={pending} onClick={() => settle("lost")}>
              Verloren
            </Button>
            <Button size="sm" variant="outline" className="h-9 flex-1" disabled={pending} onClick={() => settle("void")}>
              Void
            </Button>
          </div>
          {error && <p className="text-xs text-loss">{error}</p>}
        </div>
      )}
    </Card>
  );
}
