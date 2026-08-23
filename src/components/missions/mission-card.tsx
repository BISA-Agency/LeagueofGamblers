import { Check, Clock, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

const money = new Intl.NumberFormat("nl-NL", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export type MissionCardProps = {
  title: string;
  description: string;
  /** Cash reward, only ever set on challenge missions. */
  rewardAmount: number | null;
  rewardXp: number | null;
  hasBadge: boolean;
  completed: boolean;
  /** Nobody can still claim it: max winners reached. */
  full: boolean;
  expired: boolean;
  deadline?: string;
  progress: { current: number; target: number } | null;
  winners: string[];
};

/**
 * The reward is the loudest thing on the card. It used to sit in a muted line
 * under the description, which made a page of prizes read like a settings
 * list.
 *
 * The tile deliberately borrows the footprint of a sportsbook odds button —
 * the app's central object — so a mission reads as something on offer. Cash is
 * the brand accent, XP is the podium gold, so the two kinds of mission are
 * distinguishable before you read a word.
 */
export function MissionCard(props: MissionCardProps) {
  const { completed, full, expired, progress } = props;
  const unavailable = expired || (full && !completed);
  const percent = progress ? Math.min(100, (progress.current / progress.target) * 100) : 0;

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card transition-colors",
        completed
          ? "border-profit/35"
          : unavailable
            ? "border-border opacity-55"
            : "border-border hover:border-white/20"
      )}
    >
      <div className="flex items-start gap-4 p-4">
        <div className="min-w-0 flex-1">
          <h3
            className={cn(
              "text-sm font-semibold leading-snug",
              unavailable && "text-muted-foreground"
            )}
          >
            {props.title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">{props.description}</p>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {completed && (
              <span className="flex items-center gap-1 font-medium text-profit">
                <Check className="size-3.5" /> Behaald
              </span>
            )}
            {!completed && full && (
              <span className="flex items-center gap-1">
                <Lock className="size-3.5" /> Vol
              </span>
            )}
            {props.deadline && !completed && (
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" /> {props.deadline}
              </span>
            )}
            {props.hasBadge && <span>+ badge</span>}
            {props.winners.length > 0 && (
              <span className="truncate">Behaald door {props.winners.join(", ")}</span>
            )}
          </div>
        </div>

        <RewardTile {...props} />
      </div>

      {/* Progress runs along the bottom edge of the card rather than sitting
          in it as a widget — the card itself is the meter. */}
      {progress && !completed && !unavailable && (
        <div className="flex items-center gap-2 px-4 pb-3">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-accent-brand transition-[width]"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
            {progress.current}/{progress.target}
          </span>
        </div>
      )}
    </article>
  );
}

function RewardTile({
  rewardAmount,
  rewardXp,
  completed,
  expired,
  full,
}: Pick<MissionCardProps, "rewardAmount" | "rewardXp" | "completed" | "expired" | "full">) {
  const unavailable = expired || (full && !completed);
  const isCash = Boolean(rewardAmount);

  const tone = completed
    ? { border: "border-profit/40", bg: "bg-profit/10", text: "text-profit" }
    : unavailable
      ? { border: "border-border", bg: "bg-secondary/30", text: "text-muted-foreground" }
      : isCash
        ? { border: "border-accent-brand/40", bg: "bg-accent-brand/10", text: "text-accent-brand" }
        : { border: "border-[#f5c74a]/40", bg: "bg-[#f5c74a]/10", text: "text-[#f5c74a]" };

  return (
    <div
      className={cn(
        "flex h-14 min-w-20 shrink-0 flex-col items-center justify-center rounded-lg border px-3",
        tone.border,
        tone.bg
      )}
    >
      {completed ? (
        <Check className={cn("size-5", tone.text)} />
      ) : (
        <>
          <span className={cn("text-base font-semibold leading-none tabular-nums", tone.text)}>
            {isCash ? `€${money.format(rewardAmount!)}` : rewardXp ? `${rewardXp}` : "—"}
          </span>
          {/* The euro sign already says what it is; a bare number does not. */}
          {!isCash && (
            <span className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              {rewardXp ? "XP" : "eer"}
            </span>
          )}
        </>
      )}
    </div>
  );
}
