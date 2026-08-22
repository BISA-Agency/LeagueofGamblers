import { and, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { UserAvatar } from "@/components/profile/user-avatar";
import { LeaderboardAutoRefresh } from "@/components/leaderboard/auto-refresh";
import { db } from "@/lib/db";
import { bets, challengeParticipants } from "@drizzle/schema";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Leaderboard" };

const moneyFormatter = new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const participation = await db.query.challengeParticipants.findFirst({
    where: eq(challengeParticipants.userId, user.id),
    with: { challenge: true },
  });

  if (!participation) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-lg font-semibold">Leaderboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">Je doet nog niet mee aan een challenge.</p>
      </div>
    );
  }

  const [participants, challengeBets] = await Promise.all([
    db.query.challengeParticipants.findMany({
      where: and(
        eq(challengeParticipants.challengeId, participation.challengeId),
        eq(challengeParticipants.paidBuyIn, true)
      ),
      with: { user: true },
    }),
    db.query.bets.findMany({ where: eq(bets.challengeId, participation.challengeId) }),
  ]);

  const startingBalance = participation.challenge.startingBalance;

  const rows = participants
    .map((p) => {
      const myBets = challengeBets.filter((b) => b.userId === p.userId);
      const settled = myBets.filter((b) => b.status !== "open");
      const won = settled.filter((b) => b.status === "won" || b.status === "half_won");
      const open = myBets.filter((b) => b.status === "open");
      const winrate = settled.length > 0 ? (won.length / settled.length) * 100 : 0;
      const pl = p.balance - startingBalance;
      const roi = startingBalance > 0 ? (pl / startingBalance) * 100 : 0;

      return {
        participant: p,
        betsCount: myBets.length,
        openCount: open.length,
        winrate,
        pl,
        roi,
      };
    })
    .sort((a, b) => {
      if (b.participant.balance !== a.participant.balance) {
        return b.participant.balance - a.participant.balance;
      }
      if (b.winrate !== a.winrate) return b.winrate - a.winrate;
      return a.betsCount - b.betsCount;
    });

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <LeaderboardAutoRefresh />
      <div className="mb-4">
        <h1 className="text-xl font-semibold tracking-tight">Leaderboard</h1>
        <p className="text-sm text-muted-foreground">{participation.challenge.name}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm tabular-nums">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="w-10 py-2 font-normal">#</th>
              <th className="py-2 font-normal">Speler</th>
              <th className="py-2 text-right font-normal">Saldo</th>
              <th className="py-2 text-right font-normal">ROI</th>
              <th className="py-2 text-right font-normal">P/L</th>
              <th className="py-2 text-right font-normal">Bets</th>
              <th className="py-2 text-right font-normal">Winrate</th>
              <th className="py-2 text-right font-normal">Open</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const isMe = row.participant.userId === user.id;
              const isBust = row.participant.status === "bust";
              return (
                <tr
                  key={row.participant.userId}
                  className={isMe ? "bg-secondary/60" : "border-b border-border/50"}
                >
                  <td className="py-2.5">{i + 1}</td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <UserAvatar
                        username={row.participant.user.username}
                        avatarUrl={row.participant.user.avatarUrl}
                        size={24}
                      />
                      <span className="truncate">
                        {row.participant.user.username}
                        {isBust && " 💀"}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 text-right font-medium">
                    €{moneyFormatter.format(row.participant.balance)}
                  </td>
                  <td className={`py-2.5 text-right ${row.roi >= 0 ? "text-profit" : "text-loss"}`}>
                    {row.roi >= 0 ? "+" : ""}
                    {row.roi.toFixed(1)}%
                  </td>
                  <td className={`py-2.5 text-right ${row.pl >= 0 ? "text-profit" : "text-loss"}`}>
                    {row.pl >= 0 ? "+" : ""}€{moneyFormatter.format(row.pl)}
                  </td>
                  <td className="py-2.5 text-right text-muted-foreground">{row.betsCount}</td>
                  <td className="py-2.5 text-right text-muted-foreground">{row.winrate.toFixed(0)}%</td>
                  <td className="py-2.5 text-right text-muted-foreground">{row.openCount}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
