import { ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { bets } from "@drizzle/schema";
import { profitOf } from "./bets";

/**
 * All-time leaderboards, across every challenge a player has ever played.
 * Separate from the per-challenge standings: that one answers "who is winning
 * right now", these answer "who is the best at X, ever".
 */

export type RecordEntry = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  country: string | null;
  xp: number;
  levelFloor: number;
  value: number;
  /** Extra context under the name, e.g. which bet set the record. */
  detail?: string;
};

export type RecordBoard = {
  id: string;
  title: string;
  description: string;
  /** How to render `value`. */
  format: "money" | "odds" | "count" | "percent";
  entries: RecordEntry[];
};

const WON = new Set(["won", "half_won"]);

function longestStreak(statuses: string[]): number {
  let best = 0;
  let run = 0;
  for (const status of statuses) {
    if (WON.has(status)) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }
  return best;
}

/** Minimum settled bets before someone shows up in a rate-based board. */
const MIN_BETS_FOR_RATE = 10;

export async function getRecordBoards(): Promise<RecordBoard[]> {
  const [allProfiles, allBets, allParticipants] = await Promise.all([
    db.query.profiles.findMany({
      columns: {
        id: true, username: true, avatarUrl: true, country: true, xp: true, levelFloor: true,
      },
      with: { badges: { columns: { id: true } } },
    }),
    db.query.bets.findMany({
      where: ne(bets.status, "open"),
      orderBy: (b, { asc }) => asc(b.settledAt),
      with: { selections: { columns: { eventName: true, selectionLabel: true } } },
    }),
    db.query.challengeParticipants.findMany({
      columns: { userId: true, finalRank: true },
    }),
  ]);

  const byUser = new Map(allProfiles.map((p) => [p.id, p]));
  const base = (userId: string) => {
    const p = byUser.get(userId);
    if (!p) return null;
    return {
      userId: p.id,
      username: p.username,
      avatarUrl: p.avatarUrl,
      country: p.country,
      xp: p.xp,
      levelFloor: p.levelFloor,
    };
  };

  // Group settled bets per player once; every board reads from this.
  const betsByUser = new Map<string, typeof allBets>();
  for (const bet of allBets) {
    if (bet.status === "void") continue;
    // Proof bets only count once an admin approved them (§5.7).
    if (bet.kind === "proof" && bet.verificationStatus !== "approved") continue;
    const list = betsByUser.get(bet.userId) ?? [];
    list.push(bet);
    betsByUser.set(bet.userId, list);
  }

  const top = (entries: RecordEntry[], limit = 10) =>
    entries.filter((e) => e.value > 0).sort((a, b) => b.value - a.value).slice(0, limit);

  const titles: RecordEntry[] = [];
  const xp: RecordEntry[] = [];
  const badges: RecordEntry[] = [];
  const highestOdds: RecordEntry[] = [];
  const streaks: RecordEntry[] = [];
  const biggestWin: RecordEntry[] = [];
  const totalProfit: RecordEntry[] = [];
  const winrate: RecordEntry[] = [];
  const volume: RecordEntry[] = [];

  for (const profile of allProfiles) {
    const who = base(profile.id)!;
    const mine = betsByUser.get(profile.id) ?? [];

    xp.push({ ...who, value: profile.xp });
    badges.push({ ...who, value: profile.badges.length });
    titles.push({
      ...who,
      value: allParticipants.filter((p) => p.userId === profile.id && p.finalRank === 1).length,
    });

    if (mine.length === 0) continue;

    volume.push({ ...who, value: mine.length });

    const won = mine.filter((b) => WON.has(b.status));
    if (mine.length >= MIN_BETS_FOR_RATE) {
      winrate.push({
        ...who,
        value: (won.length / mine.length) * 100,
        detail: `${won.length} van ${mine.length}`,
      });
    }

    const bestOdds = won.reduce<(typeof mine)[number] | null>(
      (best, b) => (!best || b.totalOdds > best.totalOdds ? b : best),
      null
    );
    if (bestOdds) {
      highestOdds.push({
        ...who,
        value: bestOdds.totalOdds,
        detail: bestOdds.selections[0]?.selectionLabel ?? undefined,
      });
    }

    streaks.push({ ...who, value: longestStreak(mine.map((b) => b.status)) });

    const profits = mine.map((b) => ({ bet: b, profit: profitOf(b) }));
    const best = profits.reduce((a, b) => (b.profit > a.profit ? b : a));
    if (best.profit > 0) {
      biggestWin.push({
        ...who,
        value: best.profit,
        detail: best.bet.selections[0]?.eventName ?? undefined,
      });
    }

    totalProfit.push({
      ...who,
      value: profits.reduce((sum, p) => sum + p.profit, 0),
    });
  }

  return [
    {
      id: "titles",
      title: "Challenges gewonnen",
      description: "Wie het vaakst als eerste eindigde.",
      format: "count",
      entries: top(titles),
    },
    {
      id: "xp",
      title: "Meeste XP",
      description: "Opgebouwd over al je challenges heen.",
      format: "count",
      entries: top(xp),
    },
    {
      id: "highest-odds",
      title: "Hoogste gewonnen quotering",
      description: "De grootste gok die ook echt binnenkwam.",
      format: "odds",
      entries: top(highestOdds),
    },
    {
      id: "streak",
      title: "Langste winreeks",
      description: "Meeste winnende bets achter elkaar.",
      format: "count",
      entries: top(streaks),
    },
    {
      id: "biggest-win",
      title: "Grootste winst op één bet",
      description: "De klapper van het jaar.",
      format: "money",
      entries: top(biggestWin),
    },
    {
      id: "total-profit",
      title: "Meeste winst totaal",
      description: "Alle challenges bij elkaar opgeteld.",
      format: "money",
      entries: top(totalProfit),
    },
    {
      id: "winrate",
      title: "Beste winrate",
      description: `Vanaf ${MIN_BETS_FOR_RATE} afgeronde bets.`,
      format: "percent",
      entries: top(winrate),
    },
    {
      id: "volume",
      title: "Meeste bets",
      description: "Wie het vaakst inlegt.",
      format: "count",
      entries: top(volume),
    },
    {
      id: "badges",
      title: "Meeste badges",
      description: "Van de veertien te verdienen badges.",
      format: "count",
      entries: top(badges),
    },
  ];
}
