"use client";

import { useActionState, useState } from "react";
import { submitScorePrediction, type PredictionState } from "@/actions/predictions-daily";
import { TeamBadge } from "@/components/sportsbook/team-badge";
import { formatEventTime } from "@/lib/format-event-time";
import type { DailyMatchView } from "@/lib/predictions/daily";
import { cn } from "@/lib/utils";

const EMPTY: PredictionState = {};
const money = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 });
/** Nought to five covers all but a handful of football scores. */
const TALLIES = [0, 1, 2, 3, 4, 5];

/**
 * The match of the day: call the score, win a fifth of what you started with.
 *
 * Built as a scoreboard rather than a form. Two crests with a number between
 * them is how a result is written everywhere in football, so the thing you are
 * filling in looks like the thing you are predicting — and the two rows of
 * tallies underneath are the betting-shop layout the sportsbook already uses
 * for correct score.
 *
 * One guess each, so the state after submitting is the point of the card, not
 * an afterthought: it keeps showing your score, all evening, until the match
 * decides it.
 */
export function DailyPredictionCard({ match }: { match: DailyMatchView }) {
  const [state, action, pending] = useActionState(submitScorePrediction, EMPTY);
  const [home, setHome] = useState<number | null>(null);
  const [away, setAway] = useState<number | null>(null);

  const decided = match.mine?.settledAt != null;
  const won = (match.mine?.rewardAmount ?? 0) > 0;
  const chosen = home !== null && away !== null;

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

      {/* The scoreboard: two sides with the score between them. Before anyone
          picks it shows dashes, which is what an unplayed match looks like. */}
      <div className="flex items-center gap-3 px-4 py-4">
        <Side name={match.homeTeam ?? match.name} />
        <div className="shrink-0 text-center">
          <p className="text-3xl font-semibold tabular-nums leading-none">
            <span className={cn(home !== null && "text-accent-brand")}>
              {match.mine ? match.mine.homeGoals : (home ?? "–")}
            </span>
            <span className="mx-1.5 text-muted-foreground">:</span>
            <span className={cn(away !== null && "text-accent-brand")}>
              {match.mine ? match.mine.awayGoals : (away ?? "–")}
            </span>
          </p>
          {match.finalScore && (
            <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
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
            decided
              ? won
                ? "border-accent-brand/40 bg-accent-brand/10 text-accent-brand"
                : "border-border text-muted-foreground"
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
        <form action={action} className="space-y-3 border-t border-border px-4 pb-4 pt-3">
          <input type="hidden" name="dailyMatchId" value={match.dailyMatchId} />
          <input type="hidden" name="homeGoals" value={home ?? ""} />
          <input type="hidden" name="awayGoals" value={away ?? ""} />

          <TallyRow
            label={match.homeTeam ?? "Thuis"}
            value={home}
            onPick={setHome}
            disabled={pending}
          />
          <TallyRow
            label={match.awayTeam ?? "Uit"}
            value={away}
            onPick={setAway}
            disabled={pending}
          />

          <button
            type="submit"
            disabled={!chosen || pending}
            className={cn(
              "flex h-11 w-full items-center justify-center rounded-lg text-sm font-semibold transition-colors",
              chosen
                ? "bg-accent-brand text-accent-brand-foreground hover:brightness-95"
                : "cursor-not-allowed bg-secondary text-muted-foreground"
            )}
          >
            {pending
              ? "Bezig…"
              : chosen
                ? `Zet ${home}–${away} vast voor €${money.format(match.reward)}`
                : "Kies een score"}
          </button>

          {state.error && <p className="text-xs text-loss">{state.error}</p>}

          <p className="text-center text-[11px] text-muted-foreground">
            Eén score per persoon · goed = €{money.format(match.reward)} cadeau ·{" "}
            {match.playerCount} {match.playerCount === 1 ? "speler deed" : "spelers deden"} mee
          </p>
        </form>
      ) : (
        <div className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
          Je hebt deze niet ingevuld. Morgen weer een kans.
        </div>
      )}

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

function TallyRow({
  label,
  value,
  onPick,
  disabled,
}: {
  label: string;
  value: number | null;
  onPick: (goals: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="truncate text-[11px] text-muted-foreground">{label}</p>
      <div className="flex gap-1.5">
        {TALLIES.map((goals) => (
          <button
            key={goals}
            type="button"
            disabled={disabled}
            onClick={() => onPick(goals)}
            aria-pressed={value === goals}
            className={cn(
              "h-10 flex-1 rounded-md border text-sm font-medium tabular-nums transition-colors",
              value === goals
                ? "border-accent-brand bg-accent-brand/15 text-accent-brand"
                : "border-border bg-secondary/40 text-foreground hover:border-foreground/25"
            )}
          >
            {goals}
          </button>
        ))}
      </div>
    </div>
  );
}
