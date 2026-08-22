"use client";

import { useActionState, useEffect, useRef } from "react";
import { postFeedMessage, type PostMessageState } from "@/actions/activity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: PostMessageState = {};

export function FeedComposer({
  challengeId,
  parentId = null,
  placeholder = "Zeg iets tegen het veld…",
  autoFocus = false,
}: {
  challengeId: string;
  parentId?: string | null;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const action = postFeedMessage.bind(null, challengeId, parentId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the input once the message landed, so firing off the next one is
  // instant — chat, not a form.
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-1">
      <div className="flex gap-2">
        <Input
          name="text"
          maxLength={280}
          placeholder={placeholder}
          required
          autoFocus={autoFocus}
          autoComplete="off"
          className="h-11 flex-1"
        />
        <Button type="submit" size="sm" className="h-11" disabled={pending}>
          {pending ? "…" : "Plaats"}
        </Button>
      </div>
      {state.error && <p className="text-xs text-loss">{state.error}</p>}
    </form>
  );
}
