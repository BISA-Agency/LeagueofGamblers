"use client";

import { useActionState } from "react";
import {
  finishChallengeAction,
  type FinishChallengeState,
} from "@/actions/admin/challenge-lifecycle";
import { Button } from "@/components/ui/button";

const initialState: FinishChallengeState = {};

export function FinishChallengeForm({ challengeId }: { challengeId: string }) {
  const action = finishChallengeAction.bind(null, challengeId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Sluit de challenge af: de eindstand wordt vastgelegd, prijzen komen als openstaande
        uitbetalingen in de betalingenlijst en de eindbadges worden toegekend. Kan alleen als
        er geen open bets meer zijn.
      </p>
      <Button type="submit" size="sm" className="h-11" disabled={pending}>
        {pending ? "Afsluiten…" : "Challenge afsluiten"}
      </Button>
      {state.error && <p className="text-sm text-loss">{state.error}</p>}
      {state.ok && <p className="text-sm text-profit">{state.ok}</p>}
    </form>
  );
}
