import Link from "next/link";
import { UserAvatar } from "@/components/profile/user-avatar";
import { UsernameWithFlag } from "@/components/profile/username-with-flag";
import type { RecordBoard } from "@/lib/stats/records";
import { cn } from "@/lib/utils";

const money = new Intl.NumberFormat("nl-NL", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function formatValue(value: number, format: RecordBoard["format"]) {
  switch (format) {
    case "money":
      return `€${money.format(value)}`;
    case "odds":
      return value.toFixed(2);
    case "percent":
      return `${value.toFixed(0)}%`;
    default:
      return money.format(value);
  }
}

// Only the top three get a medal tint; below that the rank number is enough.
const MEDAL = ["#f5c74a", "#cfd4d9", "#d18f56"];

export function RecordBoardCard({
  board,
  currentUserId,
}: {
  board: RecordBoard;
  currentUserId: string;
}) {
  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">{board.title}</h2>
        <p className="text-xs text-muted-foreground">{board.description}</p>
      </header>

      {board.entries.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
          Nog geen gegevens — dit vult zich zodra er gewed wordt.
        </p>
      ) : (
        <ol className="divide-y divide-border/60">
          {board.entries.map((entry, i) => {
            const isMe = entry.userId === currentUserId;
            return (
              <li
                key={entry.userId}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5",
                  isMe && "bg-accent-brand/5"
                )}
              >
                <span
                  className="w-5 shrink-0 text-center text-xs font-semibold tabular-nums"
                  style={i < 3 ? { color: MEDAL[i] } : { color: "var(--muted-foreground)" }}
                >
                  {i + 1}
                </span>
                <UserAvatar username={entry.username} avatarUrl={entry.avatarUrl} size={26} />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/app/profile/${entry.username}`}
                    className="block min-w-0 text-sm hover:underline"
                  >
                    <UsernameWithFlag username={entry.username} country={entry.country} />
                  </Link>
                  {entry.detail && (
                    <p className="truncate text-[11px] text-muted-foreground">{entry.detail}</p>
                  )}
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatValue(entry.value, board.format)}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
