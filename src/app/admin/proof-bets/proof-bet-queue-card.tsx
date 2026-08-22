"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { approveProofBet, rejectProofBet } from "@/actions/admin/proof-bets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Bet, BetSelection } from "@drizzle/schema";

const dateFormatter = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Amsterdam",
});

export function ProofBetQueueCard({
  bet,
  username,
  screenshotUrl,
}: {
  bet: Bet & { selections: BetSelection[] };
  username: string;
  screenshotUrl: string | null;
}) {
  const [reason, setReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function approve() {
    setError(null);
    startTransition(() => approveProofBet(bet.id));
  }

  function reject() {
    setError(null);
    if (!reason.trim()) {
      setError("Geef een reden op.");
      return;
    }
    startTransition(async () => {
      try {
        await rejectProofBet(bet.id, reason);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Afkeuren mislukt.");
      }
    });
  }

  return (
    <div className="grid gap-4 rounded-lg border border-border p-4 sm:grid-cols-2">
      <div className="relative aspect-[9/16] w-full overflow-hidden rounded-md bg-secondary">
        {screenshotUrl ? (
          <Image src={screenshotUrl} alt="Screenshot van de bet" fill className="object-contain" unoptimized />
        ) : (
          <p className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Geen screenshot beschikbaar
          </p>
        )}
      </div>
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium">{username}</p>
          <p className="text-xs text-muted-foreground tabular-nums">
            Geplaatst {dateFormatter.format(bet.placedAt)} · inzet €{bet.stake.toLocaleString("nl-NL")} ·
            odds {bet.totalOdds.toFixed(2)} · {bet.bookmaker}
          </p>
        </div>
        <div className="space-y-1">
          {bet.selections.map((s) => (
            <p key={s.id} className="text-xs text-muted-foreground">
              {s.eventName} — {s.selectionLabel} ({s.odds.toFixed(2)}) · {dateFormatter.format(s.eventStart)}
            </p>
          ))}
        </div>
        {bet.note && <p className="text-xs italic text-muted-foreground">&ldquo;{bet.note}&rdquo;</p>}

        {!showReject ? (
          <div className="flex gap-2">
            <Button size="sm" className="h-11" disabled={pending} onClick={approve}>
              Goedkeuren
            </Button>
            <Button size="sm" variant="outline" className="h-11" disabled={pending} onClick={() => setShowReject(true)}>
              Afkeuren
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Input
              placeholder="Reden voor afkeuren"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-11"
            />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-11 text-loss" disabled={pending} onClick={reject}>
                Bevestig afkeuren
              </Button>
              <Button size="sm" variant="ghost" className="h-11" onClick={() => setShowReject(false)}>
                Annuleren
              </Button>
            </div>
          </div>
        )}
        {error && <p className="text-xs text-loss">{error}</p>}
      </div>
    </div>
  );
}
