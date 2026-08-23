// The mission catalogue. Idempotent: matched on (type, params, challengeId),
// so re-running updates copy and rewards instead of piling up duplicates.
//
//   npm run db:seed-missions                 career + LoG missions only
//   npm run db:seed-missions -- --slug=xyz   also seed that challenge's season missions
//
// Season missions carry money and therefore have to be attached to a specific
// challenge; career missions have challengeId null and never reset.
import { config } from "dotenv";
config({ path: ".env.local" });

type Seed = {
  title: string;
  description: string;
  type: string;
  params: Record<string, number | string>;
  rewardXp?: number;
  rewardAmount?: number;
  /** Caps what a money mission can ever cost, however many players join. */
  maxWinners?: number;
};

/** Career-wide. One-time, XP only, never reset. */
const CAREER: Seed[] = [
  // Chains — one design, four rungs, years of runway.
  { title: "Eerste winst", description: "Win je allereerste bet.", type: "win_count", params: { count: 1 }, rewardXp: 50 },
  { title: "Tien binnen", description: "Win 10 bets.", type: "win_count", params: { count: 10 }, rewardXp: 150 },
  { title: "Vijftig binnen", description: "Win 50 bets.", type: "win_count", params: { count: 50 }, rewardXp: 500 },
  { title: "Tweehonderdvijftig binnen", description: "Win 250 bets.", type: "win_count", params: { count: 250 }, rewardXp: 2000 },

  { title: "Op gang", description: "Speel 25 bets uit.", type: "bets_settled", params: { count: 25 }, rewardXp: 75 },
  { title: "Vaste klant", description: "Speel 100 bets uit.", type: "bets_settled", params: { count: 100 }, rewardXp: 250 },
  { title: "Marathonloper", description: "Speel 500 bets uit.", type: "bets_settled", params: { count: 500 }, rewardXp: 900 },
  { title: "Onvermoeibaar", description: "Speel 2000 bets uit.", type: "bets_settled", params: { count: 2000 }, rewardXp: 3000 },

  { title: "Combi-debuut", description: "Win je eerste combi.", type: "combi_win", params: { minSelections: 2 }, rewardXp: 75 },
  { title: "Drie op rij", description: "Win 3 bets achter elkaar.", type: "win_streak", params: { count: 3 }, rewardXp: 100 },
  { title: "Vijf op rij", description: "Win 5 bets achter elkaar.", type: "win_streak", params: { count: 5 }, rewardXp: 300 },
  { title: "Acht op rij", description: "Win 8 bets achter elkaar.", type: "win_streak", params: { count: 8 }, rewardXp: 1200 },

  { title: "Dubbele cijfers", description: "Win een bet met quotering 10 of hoger.", type: "win_odds_min", params: { minOdds: 10 }, rewardXp: 150 },
  { title: "Twintiger", description: "Win een bet met quotering 20 of hoger.", type: "win_odds_min", params: { minOdds: 20 }, rewardXp: 400 },
  { title: "Vijftiger", description: "Win een bet met quotering 50 of hoger.", type: "win_odds_min", params: { minOdds: 50 }, rewardXp: 1500 },

  { title: "Buiten de lijnen", description: "Win in 3 verschillende sporten.", type: "sports_variety", params: { count: 3 }, rewardXp: 200 },
  { title: "Allrounder", description: "Win in 5 verschillende sporten.", type: "sports_variety", params: { count: 5 }, rewardXp: 600 },

  { title: "Scherpschutter", description: "Houd 60% winrate over minimaal 50 bets.", type: "winrate_min", params: { percent: 60, minBets: 50 }, rewardXp: 800 },
  { title: "Alles of niets", description: "Win een all-in bet.", type: "all_in_win", params: {}, rewardXp: 250 },

  // End-of-challenge, career-wide.
  { title: "Eerste maand uit", description: "Speel een challenge helemaal uit.", type: "challenges_played", params: { count: 1 }, rewardXp: 150 },
  { title: "Vaste waarde", description: "Speel 3 challenges uit.", type: "challenges_played", params: { count: 3 }, rewardXp: 500 },
  { title: "Veteraan", description: "Speel 12 challenges uit.", type: "challenges_played", params: { count: 12 }, rewardXp: 2500 },
  { title: "Op het podium", description: "Eindig in de top 3 van een challenge.", type: "challenge_finish_top", params: { rank: 3 }, rewardXp: 600 },
  { title: "Kampioen", description: "Win een challenge.", type: "challenge_finish_top", params: { rank: 1 }, rewardXp: 1500 },
];

/**
 * Per challenge. Only these carry money, and every money mission carries a
 * maxWinners, because otherwise the cost scales with the number of players
 * and the admin cannot know what a month owes. With these caps the whole
 * season costs at most EUR43 whether four people play or forty.
 *
 * Kept small on purpose: on a EUR100 buy-in, mission money is a garnish. The
 * prize pot is the prize.
 */
const SEASON: Seed[] = [
  { title: "Maandwinst", description: "Sluit de maand af op minstens €15.000.", type: "balance_reach", params: { amount: 15000 }, rewardXp: 300, rewardAmount: 5, maxWinners: 3 },
  { title: "Uit de as", description: "Zak onder €2.000 en eindig alsnog boven je startsaldo.", type: "comeback", params: { below: 2000 }, rewardXp: 400, rewardAmount: 5, maxWinners: 2 },

  // XP only — these should be reachable by everyone, so they cannot carry a
  // per-head cost.
  { title: "Overlever", description: "Haal het einde van de challenge zonder bust te gaan.", type: "survive", params: {}, rewardXp: 200 },
  { title: "Sterke week", description: "Sluit een week af met minstens €2.000 winst.", type: "profit_week", params: { amount: 2000 }, rewardXp: 200 },

  // The counterweight. Nearly every other mission pays for risk or volume;
  // with real money in the pot, restraint has to pay too.
  { title: "Koelbloedig", description: "Speel de hele challenge zonder één all-in.", type: "no_all_in", params: {}, rewardXp: 300, rewardAmount: 3, maxWinners: 3 },
  { title: "Geduldig", description: "Plaats nooit meer dan 3 bets op één dag.", type: "max_daily_bets", params: { max: 3 }, rewardXp: 300, rewardAmount: 3, maxWinners: 3 },
];

/**
 * Postgres normalises jsonb key order, so params written as
 * { percent, minBets } come back as { minBets, percent }. Comparing the
 * stringified objects therefore reported "different" and seeded a duplicate
 * of every mission with more than one parameter.
 */
function sameParams(a: unknown, b: unknown): boolean {
  const norm = (v: unknown) =>
    JSON.stringify(
      Object.fromEntries(Object.entries((v ?? {}) as Record<string, unknown>).sort())
    );
  return norm(a) === norm(b);
}

async function main() {
  const { and, eq, isNull } = await import("drizzle-orm");
  const { db } = await import("../src/lib/db");
  const { challenges, missions } = await import("../drizzle/schema");

  const slug = process.argv.find((a) => a.startsWith("--slug="))?.slice("--slug=".length);
  let challengeId: string | null = null;
  if (slug) {
    const challenge = await db.query.challenges.findFirst({ where: eq(challenges.slug, slug) });
    if (!challenge) throw new Error(`Challenge "${slug}" niet gevonden.`);
    challengeId = challenge.id;
  }

  const upsert = async (seed: Seed, forChallenge: string | null) => {
    const existing = await db.query.missions.findMany({
      where: forChallenge
        ? and(eq(missions.type, seed.type), eq(missions.challengeId, forChallenge))
        : and(eq(missions.type, seed.type), isNull(missions.challengeId)),
    });
    const match = existing.find((m) => sameParams(m.params, seed.params));

    if (match) {
      await db
        .update(missions)
        .set({
          title: seed.title,
          description: seed.description,
          rewardXp: seed.rewardXp ?? null,
          rewardAmount: seed.rewardAmount ?? null,
          maxWinners: seed.maxWinners ?? null,
        })
        .where(eq(missions.id, match.id));
      return "bijgewerkt";
    }

    await db.insert(missions).values({
      challengeId: forChallenge,
      title: seed.title,
      description: seed.description,
      type: seed.type,
      params: seed.params,
      rewardXp: seed.rewardXp ?? null,
      rewardAmount: seed.rewardAmount ?? null,
      maxWinners: seed.maxWinners ?? null,
      appliesTo: "both",
    });
    return "aangemaakt";
  };

  let made = 0;
  let updated = 0;
  for (const seed of CAREER) {
    if ((await upsert(seed, null)) === "aangemaakt") made++;
    else updated++;
  }
  console.log(`Carrière: ${made} aangemaakt, ${updated} bijgewerkt (${CAREER.length} totaal)`);

  if (challengeId) {
    made = 0;
    updated = 0;
    let budget = 0;
    for (const seed of SEASON) {
      if ((await upsert(seed, challengeId)) === "aangemaakt") made++;
      else updated++;
      // What the admin actually has to reserve: amount x how many people can
      // ever claim it. The per-player figure is the misleading one.
      budget += (seed.rewardAmount ?? 0) * (seed.maxWinners ?? 0);
    }
    console.log(`Seizoen (${slug}): ${made} aangemaakt, ${updated} bijgewerkt`);
    console.log(`Maximale kosten voor de hele challenge: €${budget}`);
  } else {
    console.log("Geen --slug meegegeven, dus geen seizoensmissies geseed.");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
