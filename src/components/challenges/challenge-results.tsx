import Link from "next/link";
import { UserAvatar } from "@/components/profile/user-avatar";
import { UsernameWithFlag } from "@/components/profile/username-with-flag";
import type { ChallengeResults } from "@/lib/challenges/results";
import { cn } from "@/lib/utils";

const money = new Intl.NumberFormat("nl-NL", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const euro = new Intl.NumberFormat("nl-NL", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const MEDALS = ["🥇", "🥈", "🥉"];

/**
 * The end of a month, on one screen.
 *
 * Three things people want to know once it's over, in the order they ask:
 * who won, what did I finish on, and who actually got paid. The virtual
 * balance decides the ranking; the euros are what leaves the pot. Those are
 * two different currencies and the board keeps them apart — a column of
 * "€10.400" next to a column of "€350" that mean completely different things
 * is how a friend group starts an argument.
 */
export function ChallengeResults({ results }: { results: ChallengeResults }) {
  const { rows, pot, prizeTotal, missionTotal, startingBalance, challengeName, final } = results;
  const podium = rows.slice(0, 3);

  return (
    <section className="overflow-hidden rounded-2xl border border-accent-brand/40 bg-card">
      <header className="border-b border-accent-brand/25 bg-accent-brand/5 px-4 py-3.5 sm:px-5">
        <p className="text-[11px] font-medium uppercase tracking-wider text-accent-brand">
          {final ? "Eindstand" : "Voorbeeld — nog niet afgerond"}
        </p>
        <h2 className="mt-0.5 text-lg font-semibold tracking-tight">{challengeName}</h2>
        <p className="mt-1 text-xs text-muted-foreground tabular-nums">
          Pot €{money.format(pot)} · {rows.length} spelers
          {missionTotal > 0 && ` · €${euro.format(missionTotal)} aan missies uitgekeerd`}
        </p>
      </header>

      {podium.length > 0 && (
        <div className="grid gap-2 border-b border-border p-4 sm:grid-cols-3 sm:px-5">
          {podium.map((row, i) => (
            <div
              key={row.userId}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-3 py-3",
                i === 0 ? "border-accent-brand/50 bg-accent-brand/8" : "border-border bg-secondary/30"
              )}
            >
              <span className="text-xl leading-none" aria-hidden>
                {MEDALS[i]}
              </span>
              <UserAvatar username={row.username} avatarUrl={row.avatarUrl} size={32} />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/app/profile/${row.username}`}
                  className="block min-w-0 truncate text-sm font-medium hover:underline"
                >
                  <UsernameWithFlag
                    username={row.username}
                    country={row.country}
                    xp={row.xp}
                    levelFloor={row.levelFloor}
                  />
                </Link>
                <p className="truncate text-xs tabular-nums text-muted-foreground">
                  €{money.format(row.balance)}
                  {row.prize > 0 && (
                    <span className="text-accent-brand"> · €{euro.format(row.prize)}</span>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm tabular-nums">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="w-10 py-2 pl-4 font-normal sm:pl-5">#</th>
              <th className="py-2 font-normal">Speler</th>
              <th className="py-2 text-right font-normal">Saldo</th>
              <th className="py-2 text-right font-normal">Winst</th>
              <th className="py-2 text-right font-normal">Prijs</th>
              <th className="py-2 pr-4 text-right font-normal sm:pr-5">Missies</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.userId} className="border-b border-border/50 last:border-0">
                <td className="py-2.5 pl-4 sm:pl-5">{row.rank}</td>
                <td className="py-2.5">
                  <Link
                    href={`/app/profile/${row.username}`}
                    className="-my-1 flex items-center gap-2 py-1 hover:underline"
                  >
                    <UserAvatar username={row.username} avatarUrl={row.avatarUrl} size={24} />
                    <span className="truncate">
                      <UsernameWithFlag
                        username={row.username}
                        country={row.country}
                        xp={row.xp}
                        levelFloor={row.levelFloor}
                      />
                      {row.isBust && " 💀"}
                    </span>
                  </Link>
                </td>
                <td className="py-2.5 text-right font-medium">€{money.format(row.balance)}</td>
                <td
                  className={cn(
                    "py-2.5 text-right",
                    row.profit > 0 && "text-profit",
                    row.profit < 0 && "text-loss"
                  )}
                >
                  {row.profit > 0 ? "+" : ""}
                  {money.format(row.profit)}
                </td>
                <td className="py-2.5 text-right">
                  {row.prize > 0 ? (
                    <span className="font-medium text-accent-brand">€{euro.format(row.prize)}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="py-2.5 pr-4 text-right sm:pr-5">
                  {row.missionEarnings > 0 ? (
                    <span className="text-accent-brand">€{euro.format(row.missionEarnings)}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer className="border-t border-border px-4 py-3 text-xs text-muted-foreground sm:px-5">
        Iedereen begon met €{money.format(startingBalance)} speelgeld. De kolom Saldo is virtueel;
        Prijs en Missies zijn echt geld.{" "}
        {prizeTotal > 0 && (
          <span className="tabular-nums">
            Samen €{euro.format(prizeTotal + missionTotal)} uitgekeerd.
          </span>
        )}
      </footer>
    </section>
  );
}
