import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type ChainCardProps = {
  title: string;
  description: string;
  rewardXp: number | null;
  rewardAmount: number | null;
  /** How many rungs the chain has, and how many are done. */
  total: number;
  done: number;
  allDone: boolean;
  progress: { current: number; target: number } | null;
  /** Only shown for a chain of one, where the pips would say nothing. */
  single: boolean;
  /** Scarcity or a deadline: "Nog 2 plekken", "Loopt tot vr 29 aug". */
  note?: string;
};

const money = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 });

/**
 * One card per chain, not per rung. The pips carry the whole ladder; the body
 * carries only the rung being chased. Four rows saying "win 1 / 10 / 50 / 250"
 * become one that says "win 50, you are at 23, two down and two to go".
 */
export function MissionChainCard(props: ChainCardProps) {
  const { allDone, progress, total, done, single } = props;
  const percent = progress ? Math.min(100, (progress.current / progress.target) * 100) : 0;

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card transition-colors",
        allDone ? "border-profit/30 opacity-70" : "border-border hover:border-white/20"
      )}
    >
      <div className="flex items-start gap-3 p-4">
        <div className="min-w-0 flex-1">
          {!single && <Pips total={total} done={done} />}

          <h3 className={cn("text-sm font-semibold leading-snug", !single && "mt-2")}>
            {props.title}
          </h3>
          <p className="mt-0.5 text-sm text-pretty text-muted-foreground">{props.description}</p>

          {progress && !allDone && (
            <div className="mt-3 space-y-1">
              <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-accent-brand transition-[width]"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="text-[11px] tabular-nums text-muted-foreground">
                {progress.current} / {progress.target}
              </p>
            </div>
          )}

          {props.note && !allDone && (
            <p className="mt-2 text-xs text-muted-foreground">{props.note}</p>
          )}

          {allDone && (
            <p className="mt-2 flex items-center gap-1 text-xs font-medium text-profit">
              <Check className="size-3.5" />
              {single ? "Behaald" : "Hele reeks behaald"}
            </p>
          )}
        </div>

        <Reward xp={props.rewardXp} amount={props.rewardAmount} dimmed={allDone} />
      </div>
    </article>
  );
}

/** The ladder at a glance: filled for done, hollow for still to come. */
function Pips({ total, done }: { total: number; done: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`${done} van ${total} behaald`}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-colors",
            i < done ? "w-5 bg-accent-brand" : "w-3 bg-secondary"
          )}
        />
      ))}
      <span className="ml-1 text-[11px] tabular-nums text-muted-foreground">
        {done}/{total}
      </span>
    </div>
  );
}

/**
 * Same footprint as a sportsbook odds button, so a mission reads as something
 * on offer. Cash gets the brand accent, XP the podium gold.
 */
function Reward({
  xp,
  amount,
  dimmed,
}: {
  xp: number | null;
  amount: number | null;
  dimmed: boolean;
}) {
  const isCash = (amount ?? 0) > 0;
  return (
    <div
      className={cn(
        "flex min-h-11 w-20 shrink-0 flex-col items-center justify-center rounded-lg border px-2 py-1.5",
        dimmed && "opacity-60",
        isCash ? "border-accent-brand/40 bg-accent-brand/10" : "border-[#f5c74a]/35 bg-[#f5c74a]/10"
      )}
    >
      {isCash ? (
        <>
          <span className="text-base font-semibold tabular-nums text-accent-brand">
            €{money.format(amount!)}
          </span>
          {xp ? <span className="text-[10px] text-muted-foreground">+{xp} XP</span> : null}
        </>
      ) : (
        <>
          <span className="text-base font-semibold tabular-nums" style={{ color: "#f5c74a" }}>
            {xp ?? 0}
          </span>
          <span className="text-[10px] text-muted-foreground">XP</span>
        </>
      )}
    </div>
  );
}
