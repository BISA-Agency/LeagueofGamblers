import { UserAvatar } from "@/components/profile/user-avatar";
import type { WeeklyStanding } from "@/lib/challenges/week";
import { cn } from "@/lib/utils";

const money = new Intl.NumberFormat("nl-NL", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const MEDALS = ["🥇", "🥈", "🥉"];

export function WeeklyStandings({
  standings,
  currentUserId,
}: {
  standings: WeeklyStanding[];
  currentUserId: string;
}) {
  if (standings.length === 0) return null;
  const top = standings.slice(0, 3);

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium text-muted-foreground">Weekwinnaar</h2>
      <ol className="divide-y divide-border/60 rounded-lg border border-border">
        {top.map((s, i) => (
          <li
            key={s.userId}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5",
              s.userId === currentUserId && "bg-secondary/60"
            )}
          >
            <span className="w-5 text-center text-sm">{MEDALS[i]}</span>
            <UserAvatar username={s.username} avatarUrl={s.avatarUrl} size={28} />
            <span className="min-w-0 flex-1 truncate text-sm">{s.username}</span>
            <span
              className={cn(
                "shrink-0 text-sm tabular-nums",
                s.gain > 0 ? "text-profit" : s.gain < 0 ? "text-loss" : "text-muted-foreground"
              )}
            >
              {s.gain >= 0 ? "+" : "−"}€{money.format(Math.abs(s.gain))}
            </span>
          </li>
        ))}
      </ol>
      <p className="text-xs text-muted-foreground">Winst sinds maandag.</p>
    </section>
  );
}
