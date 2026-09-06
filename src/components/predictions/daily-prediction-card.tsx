"use client";

import { useActionState, useState } from "react";
import { submitScorePrediction, type PredictionState } from "@/actions/predictions-daily";
import { TeamBadge } from "@/components/sportsbook/team-badge";
import { formatEventTime } from "@/lib/format-event-time";
import { MAX_GOALS } from "@/lib/predictions/constants";
import type { DailyMatchView } from "@/lib/predictions/daily";
import { cn } from "@/lib/utils";

const EMPTY: PredictionState = {};
const money = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 });

/** Digits only, and never more goals than a football match plausibly has. */
function clean(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 1);
  if (digits === "") return "";
  return Number(digits) > MAX_GOALS ? String(MAX_GOALS) : digits;
}

/**
 * The match of the day: call the score, win a fifth of what you started with.
 *
 * The scoreboard is the form. Two crests with a score between them is how a
 * result is written everywhere in football, so rather than ask for the score
 * underneath and echo it above, the two numbers are simply the boxes you type
 * in. One thing on screen instead of two saying the same.
 *
 * One guess each, so the state after submitting is the point of the card, not
 * an afterthought: your score stays there all evening until the match decides
 * it.
 */
export function DailyPredictionCard({ match }: { match: DailyMatchView }) {
  const [state, action, pending] = useActionState(submitScorePrediction, EMPTY);
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");

  const decided = match.mine?.settledAt != null;
  const won = (match.mine?.rewardAmount ?? 0) > 0;
  const filled = home !== "" && away !== "";

  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border bg-card",
        won ? "border-accent-brand" : "border-border"
      )}
    >
      <header className="flex items-baseline justify-between gap-3 border-b border-border px-4 py-2.5">
        <p className="text-sm font-medium">Wedstrijd van de dag</p>
        <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {match.open ? formatEventTime(match.startsAt) : "gesloten"}
        </p>
      </header>

      <form action={action}>
        <input type="hidden" name="dailyMatchId" value={match.dailyMatchId} />

        <div className="flex items-center gap-3 px-4 py-4">
          <Side name={match.homeTeam ?? match.name} />

          <div className="shrink-0 text-center">
            {match.mine ? (
              <p className="text-3xl font-semibold tabular-nums leading-none">
                {match.mine.homeGoals}
                <span className="mx-1.5 text-muted-foreground">:</span>
                {match.mine.awayGoals}
              </p>
            ) : (
              <div className="flex items-center gap-1.5">
                <GoalInput
                  name="homeGoals"
                  label={`Doelpunten ${match.homeTeam ?? "thuis"}`}
                  value={home}
                  onChange={setHome}
                  disabled={!match.open || pending}
                />
                <span className="text-xl text-muted-foreground">:</span>
                <GoalInput
                  name="awayGoals"
                  label={`Doelpunten ${match.awayTeam ?? "uit"}`}
                  value={away}
                  onChange={setAway}
                  disabled={!match.open || pending}
                />
              </div>
            )}
            {match.finalScore && (
              <p className="mt-1.5 text-[11px] tabular-nums text-muted-foreground">
                eindstand {match.finalScore.home}–{match.finalScore.away}
              </p>
            )}
          </div>

          <Side name={match.awayTeam ?? ""} align="right" />
        </div>

        {match.mine ? (
          <div
            className={cn(
              "border-t px-4 py-3 text-sm",
              decided && won
                ? "border-accent-brand/40 bg-accent-brand/10 text-accent-brand"
                : "border-border text-muted-foreground"
            )}
          >
            {decided
              ? won
                ? `Goed gegokt — €${money.format(match.mine.rewardAmount ?? 0)} erbij.`
                : "Deze keer niet. Morgen een nieuwe wedstrijd."
              : "Je score staat vast. Succes."}
          </div>
        ) : match.open ? (
          <div className="space-y-2 border-t border-border px-4 pb-4 pt-3">
            <button
              type="submit"
              disabled={!filled || pending}
              className={cn(
                "flex h-11 w-full items-center justify-center rounded-lg text-sm font-semibold transition-colors",
                filled
                  ? "bg-accent-brand text-accent-brand-foreground hover:brightness-95"
                  : "cursor-not-allowed bg-secondary text-muted-foreground"
              )}
            >
              {pending
                ? "Bezig…"
                : filled
                  ? `Zet ${home}–${away} vast voor €${money.format(match.reward)}`
                  : "Vul de eindstand in"}
            </button>

            {state.error && <p className="text-xs text-loss">{state.error}</p>}

            <p className="text-center text-[11px] text-muted-foreground">
              Eén score per persoon · goed = €{money.format(match.reward)} cadeau ·{" "}
              {match.playerCount} {match.playerCount === 1 ? "speler deed" : "spelers deden"} mee
            </p>
          </div>
        ) : (
          <div className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
            Je hebt deze niet ingevuld. Morgen weer een kans.
          </div>
        )}
      </form>

      {match.winners.length > 0 && (
        <div className="border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
          Goed gegokt:{" "}
          <span className="text-accent-brand">
            {match.winners.map((w) => w.username).join(", ")}
          </span>
        </div>
      )}
    </section>
  );
}

/**
 * One goal tally.
 *
 * type="text" with inputMode="numeric" rather than type="number": it brings up
 * the number pad on a phone all the same, without the desktop spinners and
 * without a scroll wheel over the field silently changing someone's score.
 */
function GoalInput({
  name,
  label,
  value,
  onChange,
  disabled,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  disabled: boolean;
}) {
  return (
    <input
      name={name}
      value={value}
      onChange={(e) => onChange(clean(e.target.value))}
      disabled={disabled}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      aria-label={label}
      placeholder="–"
      className={cn(
        "size-12 rounded-lg border bg-secondary/40 text-center text-2xl font-semibold tabular-nums outline-none transition-colors",
        "placeholder:text-muted-foreground/50",
        "focus:border-accent-brand focus:bg-accent-brand/10",
        value !== ""
          ? "border-accent-brand text-accent-brand"
          : "border-border text-foreground hover:border-foreground/25"
      )}
    />
  );
}

function Side({ name, align = "left" }: { name: string; align?: "left" | "right" }) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center gap-2",
        align === "right" && "flex-row-reverse text-right"
      )}
    >
      <TeamBadge name={name} size={26} />
      <span className="truncate text-sm font-medium">{name}</span>
    </div>
  );
}
