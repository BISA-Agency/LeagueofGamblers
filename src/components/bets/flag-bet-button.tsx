"use client";

import { useActionState, useState } from "react";
import { flagBet, type FlagBetState } from "@/actions/proof-bets";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const initialState: FlagBetState = {};

export function FlagBetButton({ betId }: { betId: string }) {
  const action = flagBet.bind(null, betId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [open, setOpen] = useState(false);

  if (state.ok) {
    return <p className="text-xs text-muted-foreground">Betwist — een admin kijkt ernaar.</p>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >
        Betwisten
      </button>
    );
  }

  return (
    <form action={formAction} className="w-full space-y-2">
      <Textarea
        name="reason"
        rows={2}
        required
        placeholder="Wat klopt er niet aan deze bet?"
        className="text-sm"
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" className="h-9" disabled={pending}>
          {pending ? "Versturen…" : "Versturen"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-9"
          onClick={() => setOpen(false)}
        >
          Annuleren
        </Button>
      </div>
      {state.error && <p className="text-xs text-loss">{state.error}</p>}
    </form>
  );
}
