import { and, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { UserAvatar } from "@/components/profile/user-avatar";
import { UsernameWithFlag } from "@/components/profile/username-with-flag";
import { Countdown } from "@/components/challenges/countdown";
import { LeaderboardAutoRefresh } from "@/components/leaderboard/auto-refresh";
import { LeaderboardTabs } from "@/components/leaderboard/leaderboard-tabs";
import { ShareButton } from "@/components/share/share-button";
import { getActiveParticipation } from "@/lib/challenges/active";
import { hasStarted } from "@/lib/challenges/stats";
import { db } from "@/lib/db";
import { ensureInviteCode } from "@/lib/referrals/assign";
import { shareLink } from "@/lib/share/url";
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

  const { active: participation } = await getActiveParticipation(user.id);

  if (!participation) {
    return (
      <div className="mx-auto max-w-2xl space-y-5 px-4 py-6">
        <h1 className="text-xl font-semibold tracking-tight">Leaderboard</h1>
        <LeaderboardTabs active="challenge" />
        <p className="text-sm text-muted-foreground">
          Je doet nog niet mee aan een challenge. Bekijk zolang de{" "}
          <Link
            href="/app/leaderboard/records"
            className="text-accent-brand underline underline-offset-2"
          >
            records aller tijden
          </Link>
          .
        </p>
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

  const challenge = participation.challenge;
  const startingBalance = challenge.startingBalance;

  // The board is shared as its public page: it already unfurls into a top-five
  // card and it is the one screen a stranger can act on. The invite code rides
  // along so a shared standing also recruits.
  const inviteCode = await ensureInviteCode(user.id);
  const boardShare = (
    <ShareButton
      url={shareLink(`/c/${challenge.slug}`, inviteCode)}
      title={`${challenge.name} — de stand`}
      text="Kijk waar we staan in deze challenge op League of Gamblers."
      label="Deel"
    />
  );

  // Balances are only handed out when the challenge goes live, so ranking
  // before that showed everyone at -€10.000. There's nothing to rank yet
  // either — show who's in instead.
  if (!hasStarted(challenge.status)) {
    return (
      <div className="mx-auto max-w-2xl space-y-5 px-4 py-6">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Leaderboard</h1>
            <p className="text-sm text-muted-foreground">{challenge.name}</p>
          </div>
          {boardShare}
        </div>

        <LeaderboardTabs active="challenge" />

        <div className="rounded-xl border border-border bg-card p-5 text-center">
          <p className="text-sm text-muted-foreground">De challenge begint over</p>
          <Countdown label="" target={challenge.startAt.toISOString()} />
          <p className="mt-3 text-sm text-muted-foreground">
            Iedereen start dan met €{moneyFormatter.format(startingBalance)}. Zodra de eerste
            bets zijn afgerekend verschijnt hier de stand.
          </p>
        </div>

        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Aan de start ({participants.length})
          </h2>
          <div className="divide-y divide-border rounded-lg border border-border">
            {participants.map((p) => (
              <div key={p.userId} className="flex items-center gap-3 p-3">
                <UserAvatar
                  username={p.user.username}
                  avatarUrl={p.user.avatarUrl}
                  size={28}
                />
                <Link
                  href={`/app/profile/${p.user.username}`}
                  className="min-w-0 flex-1 truncate text-sm hover:underline"
                >
                  <UsernameWithFlag
                    username={p.user.username}
                    country={p.user.country}
                    xp={p.user.xp}
                    levelFloor={p.user.levelFloor}
                  />
                </Link>
                <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                  €{moneyFormatter.format(startingBalance)}
                </span>
              </div>
            ))}
            {participants.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">
                Nog niemand met een betaalde inleg.
              </p>
            )}
          </div>
        </section>
      </div>
    );
  }

  const rows = participants
    .map((p) => {
      const myBets = challengeBets.filter((b) => b.userId === p.userId);
      const settled = myBets.filter((b) => b.status !== "open");
      const won = settled.filter((b) => b.status === "won" || b.status === "half_won");
      const open = myBets.filter((b) => b.status === "open");
      const winrate = settled.length > 0 ? (won.length / settled.length) * 100 : 0;
      // Placing a bet deducts the stake from the balance, so money sitting in
      // an open bet would otherwise read as a loss. It isn't one yet — count
      // it back until the bet actually settles.
      const openStake = open.reduce((sum, b) => sum + b.stake, 0);
      const pl = p.balance + openStake - startingBalance;
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
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Leaderboard</h1>
          <p className="text-sm text-muted-foreground">{participation.challenge.name}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Link
            href="/app/compare"
            className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Head-to-head
          </Link>
          {boardShare}
        </div>
      </div>

      <LeaderboardTabs active="challenge" />

      <div className="mt-4 overflow-x-auto">
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
                        <UsernameWithFlag
                          username={row.participant.user.username}
                          country={row.participant.user.country}
                        />
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
