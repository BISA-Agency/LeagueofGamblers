"use client";

import { useActionState } from "react";
import { joinChallenge, type JoinChallengeState } from "@/actions/challenges";
import { Button } from "@/components/ui/button";

const initialState: JoinChallengeState = {};

export function JoinButton({ challengeId }: { challengeId: string }) {
  const [state, formAction, pending] = useActionState(joinChallenge, initialState);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="challengeId" value={challengeId} />
      <Button type="submit" size="sm" className="h-11 px-4" disabled={pending}>
        {pending ? "Bezig…" : "Doe mee"}
      </Button>
      {state.error && (
        <p role="alert" className="text-xs text-loss">
          {state.error}
        </p>
      )}
    </form>
  );
}
