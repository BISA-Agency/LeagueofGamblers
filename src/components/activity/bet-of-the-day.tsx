import Link from "next/link";
import { UserAvatar } from "@/components/profile/user-avatar";
import { getBetOfTheDay } from "@/lib/activity/bet-of-the-day";

const money = new Intl.NumberFormat("nl-NL", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export async function BetOfTheDay({ challengeId }: { challengeId: string }) {
  const result = await getBetOfTheDay(challengeId);
  if (!result) return null;

  const { bet, profit } = result;
  const description =
    bet.selections.length === 1
      ? `${bet.selections[0].selectionLabel} — ${bet.selections[0].eventName}`
      : `Combi van ${bet.selections.length} selecties`;

  return (
    <div className="rounded-lg border border-accent-brand/40 bg-accent-brand/5 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-accent-brand">
        Bet van de dag
      </p>
      <div className="mt-2 flex items-center gap-3">
        <UserAvatar username={bet.user.username} avatarUrl={bet.user.avatarUrl} size={36} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            <Link href={`/app/profile/${bet.user.username}`} className="hover:underline">
              {bet.user.username}
            </Link>{" "}
            <span className="text-profit">+€{money.format(profit)}</span>
          </p>
          <p className="truncate text-xs text-muted-foreground">{description}</p>
        </div>
        <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
          @{bet.totalOdds.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
