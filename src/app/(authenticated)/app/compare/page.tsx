import { and, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { ComparePicker } from "@/components/compare/compare-picker";
import { FieldChart } from "@/components/charts/field-chart";
import { UserAvatar } from "@/components/profile/user-avatar";
import { getSnapshotsForUsers } from "@/lib/challenges/rank-snapshots";
import { db } from "@/lib/db";
import { getLevelInfo } from "@/lib/levels";
import { bets, challengeParticipants, type Bet } from "@drizzle/schema";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Head-to-head" };

const money = new Intl.NumberFormat("nl-NL", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** What a settled bet actually returned to the player, minus what it cost. */
function profitOf(bet: Bet): number {
  switch (bet.status) {
    case "won":
      return bet.potentialPayout - bet.stake;
    case "half_won":
      return (bet.potentialPayout - bet.stake) / 2;
    case "half_lost":
      return -bet.stake / 2;
    case "lost":
      return -bet.stake;
    default:
      return 0;
  }
}

function statsFor(playerBets: Bet[], balance: number, startingBalance: number) {
  const settled = playerBets.filter((b) => b.status !== "open" && b.status !== "void");
  const won = settled.filter((b) => b.status === "won" || b.status === "half_won");
  const profits = settled.map(profitOf);

  return {
    balance,
    pl: balance - startingBalance,
    roi: startingBalance > 0 ? ((balance - startingBalance) / startingBalance) * 100 : 0,
    betsCount: playerBets.length,
    openCount: playerBets.filter((b) => b.status === "open").length,
    winrate: settled.length > 0 ? (won.length / settled.length) * 100 : 0,
    avgOdds:
      playerBets.length > 0
        ? playerBets.reduce((sum, b) => sum + b.totalOdds, 0) / playerBets.length
        : 0,
    biggestWin: profits.length > 0 ? Math.max(0, ...profits) : 0,
    totalStaked: playerBets.reduce((sum, b) => sum + b.stake, 0),
  };
}

type Row = {
  label: string;
  a: string;
  b: string;
  /** 1 = left player wins the row, -1 = right, 0 = tie or not a contest. */
  winner: number;
};

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const myParticipation = await db.query.challengeParticipants.findFirst({
    where: eq(challengeParticipants.userId, user.id),
    with: { challenge: true, user: true },
  });

  if (!myParticipation) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-lg font-semibold">Head-to-head</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Je doet nog niet mee aan een challenge.
        </p>
      </div>
    );
  }

  const challenge = myParticipation.challenge;
  const participants = await db.query.challengeParticipants.findMany({
    where: and(
      eq(challengeParticipants.challengeId, challenge.id),
      eq(challengeParticipants.paidBuyIn, true)
    ),
    with: { user: true },
  });

  if (participants.length < 2) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-lg font-semibold">Head-to-head</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Er is nog maar één speler in {challenge.name}.
        </p>
      </div>
    );
  }

  const usernames = participants.map((p) => p.user.username).sort();
  const { a: aParam, b: bParam } = await searchParams;

  const defaultA = myParticipation.user.username;
  const aName = usernames.includes(aParam ?? "") ? aParam! : defaultA;
  const bName =
    usernames.includes(bParam ?? "") && bParam !== aName
      ? bParam!
      : usernames.find((u) => u !== aName)!;

  const left = participants.find((p) => p.user.username === aName)!;
  const right = participants.find((p) => p.user.username === bName)!;

  const [challengeBets, snapshots] = await Promise.all([
    db.query.bets.findMany({ where: eq(bets.challengeId, challenge.id) }),
    getSnapshotsForUsers(challenge.id, [left.userId, right.userId]),
  ]);

  const leftStats = statsFor(
    challengeBets.filter((b) => b.userId === left.userId),
    left.balance,
    challenge.startingBalance
  );
  const rightStats = statsFor(
    challengeBets.filter((b) => b.userId === right.userId),
    right.balance,
    challenge.startingBalance
  );

  const compare = (x: number, y: number) => (x === y ? 0 : x > y ? 1 : -1);
  const signed = (v: number) => `${v >= 0 ? "+" : ""}€${money.format(v)}`;

  const rows: Row[] = [
    {
      label: "Saldo",
      a: `€${money.format(leftStats.balance)}`,
      b: `€${money.format(rightStats.balance)}`,
      winner: compare(leftStats.balance, rightStats.balance),
    },
    {
      label: "P/L",
      a: signed(leftStats.pl),
      b: signed(rightStats.pl),
      winner: compare(leftStats.pl, rightStats.pl),
    },
    {
      label: "ROI",
      a: `${leftStats.roi >= 0 ? "+" : ""}${leftStats.roi.toFixed(1)}%`,
      b: `${rightStats.roi >= 0 ? "+" : ""}${rightStats.roi.toFixed(1)}%`,
      winner: compare(leftStats.roi, rightStats.roi),
    },
    {
      label: "Winrate",
      a: `${leftStats.winrate.toFixed(0)}%`,
      b: `${rightStats.winrate.toFixed(0)}%`,
      winner: compare(leftStats.winrate, rightStats.winrate),
    },
    {
      label: "Grootste winst",
      a: `€${money.format(leftStats.biggestWin)}`,
      b: `€${money.format(rightStats.biggestWin)}`,
      winner: compare(leftStats.biggestWin, rightStats.biggestWin),
    },
    {
      label: "XP",
      a: `${left.user.xp}`,
      b: `${right.user.xp}`,
      winner: compare(left.user.xp, right.user.xp),
    },
    // Below here: descriptive, not a contest — more bets or higher odds is a
    // playing style, not a better score.
    {
      label: "Bets",
      a: `${leftStats.betsCount} (${leftStats.openCount} open)`,
      b: `${rightStats.betsCount} (${rightStats.openCount} open)`,
      winner: 0,
    },
    {
      label: "Gem. odds",
      a: leftStats.avgOdds.toFixed(2),
      b: rightStats.avgOdds.toFixed(2),
      winner: 0,
    },
    {
      label: "Totaal ingezet",
      a: `€${money.format(leftStats.totalStaked)}`,
      b: `€${money.format(rightStats.totalStaked)}`,
      winner: 0,
    },
  ];

  const leftScore = rows.filter((r) => r.winner === 1).length;
  const rightScore = rows.filter((r) => r.winner === -1).length;

  const series = [left, right].map((p) => ({
    username: p.user.username,
    points: snapshots
      .filter((s) => s.userId === p.userId)
      .map((s) => ({ date: s.date, balance: s.balance })),
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Head-to-head</h1>
        <p className="text-sm text-muted-foreground">{challenge.name}</p>
      </div>

      <ComparePicker usernames={usernames} a={aName} b={bName} />

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        {[left, right].map((p, i) => (
          <div
            key={p.userId}
            className={cn(
              "flex flex-col items-center gap-1",
              i === 1 && "order-3"
            )}
          >
            <UserAvatar username={p.user.username} avatarUrl={p.user.avatarUrl} size={48} />
            <span className="max-w-full truncate text-sm font-medium">{p.user.username}</span>
            <span className="text-xs text-muted-foreground">
              {getLevelInfo(p.user.xp).title}
            </span>
          </div>
        ))}
        <div className="order-2 text-center text-2xl font-semibold tabular-nums">
          {leftScore}–{rightScore}
        </div>
      </div>

      <dl className="divide-y divide-border/60 rounded-lg border border-border">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-2.5">
            <dd
              className={cn(
                "text-right text-sm tabular-nums",
                row.winner === 1 ? "font-semibold text-accent-brand" : "text-foreground"
              )}
            >
              {row.a}
            </dd>
            <dt className="min-w-24 text-center text-xs text-muted-foreground">{row.label}</dt>
            <dd
              className={cn(
                "text-left text-sm tabular-nums",
                row.winner === -1 ? "font-semibold text-accent-brand" : "text-foreground"
              )}
            >
              {row.b}
            </dd>
          </div>
        ))}
      </dl>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Saldoverloop</h2>
        <FieldChart series={series} />
      </section>
    </div>
  );
}
