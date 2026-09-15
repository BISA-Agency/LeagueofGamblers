"use client";

import { useActionState, useState } from "react";
import { submitBountyPrediction, type BountyPredictionState } from "@/actions/bounties";
import { MAX_GOALS } from "@/lib/predictions/constants";
import { cn } from "@/lib/utils";
import type { BountyRoundMatchView } from "@/lib/bounties/view";

const EMPTY: BountyPredictionState = {};

function clean(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 1);
  if (digits === "") return "";
  return Number(digits) > MAX_GOALS ? String(MAX_GOALS) : digits;
}

export function BountyMatchRow({ match }: { match: BountyRoundMatchView }) {
  const [state, action, pending] = useActionState(submitBountyPrediction, EMPTY);
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  const filled = home !== "" && away !== "";

  return (
    <div className="border-t border-border px-4 py-3 first:border-t-0">
      <form action={action} className="flex items-center gap-3">
        <input type="hidden" name="bountyRoundMatchId" value={match.bountyRoundMatchId} />
        <div className="min-w-0 flex-1 truncate text-sm">
          {match.homeTeam ?? match.name} <span className="text-muted-foreground">–</span>{" "}
          {match.awayTeam ?? ""}
        </div>

        {match.mine ? (
          <p className="shrink-0 text-sm font-semibold tabular-nums">
            {match.mine.homeGoals}–{match.mine.awayGoals}
          </p>
        ) : match.open ? (
          <div className="flex shrink-0 items-center gap-1.5">
            <GoalInput
              name="homeGoals"
              value={home}
              onChange={setHome}
              disabled={pending}
              label={`Doelpunten ${match.homeTeam ?? "thuis"}`}
            />
            <span className="text-muted-foreground">:</span>
            <GoalInput
              name="awayGoals"
              value={away}
              onChange={setAway}
              disabled={pending}
              label={`Doelpunten ${match.awayTeam ?? "uit"}`}
            />
            <button
              type="submit"
              disabled={!filled || pending}
              className={cn(
                "ml-1 h-9 rounded-lg px-3 text-xs font-semibold transition-colors",
                filled
                  ? "bg-accent-brand text-accent-brand-foreground hover:brightness-95"
                  : "cursor-not-allowed bg-secondary text-muted-foreground"
              )}
            >
              Zet vast
            </button>
          </div>
        ) : (
          <p className="shrink-0 text-xs text-muted-foreground">gesloten</p>
        )}
      </form>
      {state.error && <p className="mt-1.5 text-xs text-loss">{state.error}</p>}
    </div>
  );
}

function GoalInput({
  name,
  value,
  onChange,
  disabled,
  label,
}: {
  name: string;
  value: string;
  onChange: (next: string) => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <input
      name={name}
      value={value}
      onChange={(e) => onChange(clean(e.target.value))}
      disabled={disabled}
      aria-label={label}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder="–"
      className={cn(
        "size-9 rounded-lg border bg-secondary/40 text-center text-sm font-semibold tabular-nums outline-none transition-colors",
        "focus:border-accent-brand focus:bg-accent-brand/10",
        value !== "" ? "border-accent-brand text-accent-brand" : "border-border text-foreground"
      )}
    />
  );
}
