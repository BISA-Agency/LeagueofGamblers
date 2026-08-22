// Brings the demo challenge to life: two weeks of bet history, diverging
// balances, daily rank snapshots (so the sparklines and field chart have
// curves), an activity timeline with chat threads, and a few badges.
//
// This is what the landing-page screenshots are taken against (§10), and it's
// the fastest way to see the app in a realistic mid-challenge state.
//
//   npm run db:seed-demo-state             build the state
//   npm run db:seed-demo-state -- --clean  tear it back down
//
// Deterministic: the same seed produces the same story every run.
import { config } from "dotenv";
config({ path: ".env.local" });

const CHALLENGE_SLUG = "demo";
const DAYS = 14;

/** mulberry32 — small, seeded, good enough for fake bet history. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PAST_FIXTURES = [
  { name: "Ajax - Sparta", sport: "Voetbal", competition: "Eredivisie", picks: ["Ajax", "Gelijkspel", "Sparta"] },
  { name: "PSV - Vitesse", sport: "Voetbal", competition: "Eredivisie", picks: ["PSV", "Over 3.5", "Vitesse"] },
  { name: "Feyenoord - Go Ahead", sport: "Voetbal", competition: "Eredivisie", picks: ["Feyenoord -1.5", "Over 2.5", "Go Ahead"] },
  { name: "Man City - Chelsea", sport: "Voetbal", competition: "Premier League", picks: ["Man City", "Beide scoren", "Chelsea"] },
  { name: "Liverpool - Everton", sport: "Voetbal", competition: "Premier League", picks: ["Liverpool", "Over 2.5", "Everton"] },
  { name: "Bayern - Dortmund", sport: "Voetbal", competition: "Bundesliga", picks: ["Bayern", "Over 3.5", "Dortmund"] },
  { name: "Celtics - Heat", sport: "Basketbal", competition: "NBA", picks: ["Celtics -4.5", "Over 214.5", "Heat"] },
  { name: "Nuggets - Suns", sport: "Basketbal", competition: "NBA", picks: ["Nuggets", "Over 228.5", "Suns +6.5"] },
  { name: "Djokovic - Medvedev", sport: "Tennis", competition: "ATP", picks: ["Djokovic", "Over 3.5 sets", "Medvedev"] },
  { name: "Verstappen - pole", sport: "Formule 1", competition: "F1", picks: ["Verstappen pole", "Norris pole", "Leclerc pole"] },
];

/** Per player: how aggressive they bet, and how their month went. */
const PLAYER_SCRIPTS: Record<string, { seed: number; winRate: number; stakeMax: number }> = {
  mo_sharp: { seed: 11, winRate: 0.62, stakeMax: 900 },
  kev_allin: { seed: 22, winRate: 0.48, stakeMax: 2200 },
  sam_underdog: { seed: 33, winRate: 0.4, stakeMax: 700 },
  dani_combi: { seed: 44, winRate: 0.45, stakeMax: 800 },
  lars_grinder: { seed: 55, winRate: 0.52, stakeMax: 400 },
  noor_streak: { seed: 66, winRate: 0.44, stakeMax: 1100 },
  professional_risktaker: { seed: 77, winRate: 0.55, stakeMax: 1000 },
};

const CHAT_SCRIPT: {
  author: string;
  text: string;
  hoursAgo: number;
  replies?: { author: string; text: string; minutesLater: number }[];
}[] = [
  {
    author: "kev_allin",
    text: "Wie zet er nog wat op de Klassieker zondag? 👀",
    hoursAgo: 30,
    replies: [
      { author: "mo_sharp", text: "Ik wacht nog even op de opstellingen", minutesLater: 12 },
      { author: "sam_underdog", text: "All-in op een gelijkspel, noteer maar 🤡", minutesLater: 40 },
    ],
  },
  {
    author: "lars_grinder",
    text: "Vier keer op rij raak vandaag. Ik doe niks bijzonders hoor 😌",
    hoursAgo: 22,
    replies: [
      { author: "noor_streak", text: "Zeg dat nog een keer als je 500 in de min staat", minutesLater: 9 },
      { author: "kev_allin", text: "Grinder gaat 'm gewoon pakken deze maand", minutesLater: 25 },
    ],
  },
  {
    author: "dani_combi",
    text: "Combi van 5 erin gegooid. Bid voor me 🙏",
    hoursAgo: 8,
    replies: [{ author: "mo_sharp", text: "Vier legs raak en dan de laatste missen, klassieker", minutesLater: 15 }],
  },
  {
    author: "noor_streak",
    text: "Iemand nog een tip voor de NBA vanavond?",
    hoursAgo: 3,
  },
];

async function main() {
  const clean = process.argv.includes("--clean");

  const { and, eq, inArray, like, sql } = await import("drizzle-orm");
  const { db } = await import("../src/lib/db");
  const {
    activityFeed,
    badges,
    betSelections,
    bets,
    challengeParticipants,
    challenges,
    feedReactions,
    rankSnapshots,
    userBadges,
  } = await import("../drizzle/schema");

  const challenge = await db.query.challenges.findFirst({
    where: eq(challenges.slug, CHALLENGE_SLUG),
  });
  if (!challenge) throw new Error(`Challenge "${CHALLENGE_SLUG}" niet gevonden — draai eerst db:seed.`);

  const participants = await db.query.challengeParticipants.findMany({
    where: and(
      eq(challengeParticipants.challengeId, challenge.id),
      eq(challengeParticipants.paidBuyIn, true)
    ),
    with: { user: { columns: { id: true, username: true } } },
  });

  if (clean) {
    await db.delete(activityFeed).where(eq(activityFeed.challengeId, challenge.id));
    await db.delete(rankSnapshots).where(eq(rankSnapshots.challengeId, challenge.id));
    await db.delete(bets).where(eq(bets.challengeId, challenge.id));
    await db
      .update(challengeParticipants)
      .set({ balance: challenge.startingBalance })
      .where(eq(challengeParticipants.challengeId, challenge.id));
    console.log("Demo-state opgeruimd: bets, snapshots, activiteit weg, saldo's gereset.");
    process.exit(0);
  }

  // Start from a clean slate so re-running doesn't stack two histories.
  await db.delete(activityFeed).where(eq(activityFeed.challengeId, challenge.id));
  await db.delete(rankSnapshots).where(eq(rankSnapshots.challengeId, challenge.id));
  await db.delete(bets).where(eq(bets.challengeId, challenge.id));

  // Put the challenge mid-flight: started two weeks ago, a fortnight to go.
  const now = Date.now();
  const startAt = new Date(now - DAYS * 86_400_000);
  await db
    .update(challenges)
    .set({ startAt, endAt: new Date(now + 16 * 86_400_000), status: "live", updatedAt: new Date() })
    .where(eq(challenges.id, challenge.id));

  const dayKey = (offsetDays: number) =>
    new Date(now - offsetDays * 86_400_000).toISOString().slice(0, 10);

  type Row = { userId: string; username: string; balance: number; history: number[] };
  const rows: Row[] = [];
  let created = 0;

  for (const participant of participants) {
    const script = PLAYER_SCRIPTS[participant.user.username] ?? {
      seed: 99,
      winRate: 0.5,
      stakeMax: 500,
    };
    const rand = rng(script.seed);
    let balance = challenge.startingBalance;
    const history: number[] = [];

    for (let dayOffset = DAYS - 1; dayOffset >= 0; dayOffset--) {
      const betsToday = rand() < 0.35 ? 0 : 1 + Math.floor(rand() * 2);

      for (let i = 0; i < betsToday; i++) {
        const fixture = PAST_FIXTURES[Math.floor(rand() * PAST_FIXTURES.length)];
        const isCombi = rand() < 0.25;
        const legs = isCombi ? 2 + Math.floor(rand() * 2) : 1;
        const stake = Math.min(
          Math.max(25, Math.round(((rand() * script.stakeMax) / 25) * 25)),
          Math.max(25, Math.floor(balance * 0.4))
        );
        if (stake < 25 || stake > balance) continue;

        const legOdds = Array.from({ length: legs }, () => 1.4 + rand() * 2.6);
        const totalOdds = Number(legOdds.reduce((a, b) => a * b, 1).toFixed(2));
        const potentialPayout = Math.round(stake * totalOdds * 100) / 100;

        // Longer odds win less often than the player's baseline.
        const won = rand() < script.winRate / Math.max(1, totalOdds / 2.2);
        const placedAt = new Date(now - dayOffset * 86_400_000 - (4 + rand() * 6) * 3_600_000);
        const settledAt = new Date(placedAt.getTime() + (2 + rand() * 4) * 3_600_000);

        balance += won ? potentialPayout - stake : -stake;
        if (balance < 0) balance = 0;

        const [bet] = await db
          .insert(bets)
          .values({
            challengeId: challenge.id,
            userId: participant.userId,
            kind: rand() < 0.2 ? "proof" : "sportsbook",
            type: legs > 1 ? "combi" : "single",
            stake,
            totalOdds,
            potentialPayout,
            status: won ? "won" : "lost",
            placedAt,
            settledAt,
            eventStart: new Date(placedAt.getTime() + 3_600_000),
            verificationStatus: "n/a",
          })
          .returning();

        await db.insert(betSelections).values(
          Array.from({ length: legs }, (_, leg) => {
            const f = leg === 0 ? fixture : PAST_FIXTURES[Math.floor(rand() * PAST_FIXTURES.length)];
            return {
              betId: bet.id,
              eventName: f.name,
              eventStart: new Date(placedAt.getTime() + 3_600_000),
              sport: f.sport,
              competition: f.competition,
              marketLabel: "1X2",
              selectionLabel: f.picks[Math.floor(rand() * f.picks.length)],
              odds: Number(legOdds[leg].toFixed(2)),
              result: won ? ("won" as const) : ("lost" as const),
            };
          })
        );

        created += 1;

        // Only the biggest swings make the timeline — a feed of every bet is noise.
        const swing = won ? potentialPayout - stake : stake;
        if (swing >= 600) {
          await db.insert(activityFeed).values({
            challengeId: challenge.id,
            userId: participant.userId,
            type: won ? "bet_won" : "bet_lost",
            payload: won
              ? { payout: potentialPayout, odds: totalOdds, selection: fixture.picks[0] }
              : { stake, selection: fixture.picks[0] },
            createdAt: settledAt,
          });
        }
      }

      history.push(Math.round(balance));
    }

    // One open bet each, so "open" columns and the P/L correction are visible.
    const openStake = 50 + Math.floor(rand() * 4) * 50;
    if (balance > openStake) {
      const fixture = PAST_FIXTURES[Math.floor(rand() * PAST_FIXTURES.length)];
      const odds = Number((1.6 + rand() * 2).toFixed(2));
      const [openBet] = await db
        .insert(bets)
        .values({
          challengeId: challenge.id,
          userId: participant.userId,
          kind: "sportsbook",
          type: "single",
          stake: openStake,
          totalOdds: odds,
          potentialPayout: Math.round(openStake * odds * 100) / 100,
          status: "open",
          placedAt: new Date(now - 2 * 3_600_000),
          eventStart: new Date(now + 2 * 86_400_000),
        })
        .returning();
      await db.insert(betSelections).values({
        betId: openBet.id,
        eventName: fixture.name,
        eventStart: new Date(now + 2 * 86_400_000),
        sport: fixture.sport,
        competition: fixture.competition,
        marketLabel: "1X2",
        selectionLabel: fixture.picks[0],
        odds,
      });
      balance -= openStake;
      created += 1;
    }

    await db
      .update(challengeParticipants)
      .set({ balance: Math.round(balance), status: balance <= 0 ? "bust" : "active" })
      .where(
        and(
          eq(challengeParticipants.challengeId, challenge.id),
          eq(challengeParticipants.userId, participant.userId)
        )
      );

    rows.push({
      userId: participant.userId,
      username: participant.user.username,
      balance: Math.round(balance),
      history,
    });
  }

  // Daily snapshots from each player's running balance, ranked per day.
  console.log("Snapshots schrijven...");
  for (let dayIndex = 0; dayIndex < DAYS; dayIndex++) {
    const offset = DAYS - 1 - dayIndex;
    const standings = rows
      .map((r) => ({ userId: r.userId, balance: r.history[dayIndex] ?? challenge.startingBalance }))
      .sort((a, b) => b.balance - a.balance);

    await db
      .insert(rankSnapshots)
      .values(
        standings.map((s, i) => ({
          challengeId: challenge.id,
          userId: s.userId,
          date: dayKey(offset),
          balance: s.balance,
          rank: i + 1,
        }))
      )
      .onConflictDoUpdate({
        target: [rankSnapshots.challengeId, rankSnapshots.userId, rankSnapshots.date],
        set: { balance: sql`excluded.balance`, rank: sql`excluded.rank` },
      });
  }

  // Chat threads on top of the event timeline.
  console.log("Chat plaatsen...");
  const idByUsername = new Map(rows.map((r) => [r.username, r.userId]));
  for (const message of CHAT_SCRIPT) {
    const authorId = idByUsername.get(message.author);
    if (!authorId) continue;
    const createdAt = new Date(now - message.hoursAgo * 3_600_000);
    const [parent] = await db
      .insert(activityFeed)
      .values({
        challengeId: challenge.id,
        userId: authorId,
        type: "chat",
        payload: { text: message.text },
        createdAt,
      })
      .returning();

    for (const reply of message.replies ?? []) {
      const replyAuthor = idByUsername.get(reply.author);
      if (!replyAuthor) continue;
      await db.insert(activityFeed).values({
        challengeId: challenge.id,
        userId: replyAuthor,
        type: "chat",
        payload: { text: reply.text },
        parentId: parent.id,
        createdAt: new Date(createdAt.getTime() + reply.minutesLater * 60_000),
      });
    }

    // A couple of reactions so the feed doesn't look untouched.
    const reactors = rows.slice(0, 3).filter((r) => r.userId !== authorId);
    for (const [i, reactor] of reactors.entries()) {
      await db
        .insert(feedReactions)
        .values({ feedId: parent.id, userId: reactor.userId, emoji: ["🔥", "😂", "🫡"][i] })
        .onConflictDoNothing();
    }
  }

  // A handful of badges, so the profile vitrine isn't empty.
  const badgeGrants: [string, string][] = [
    ["mo_sharp", "hot-streak"],
    ["mo_sharp", "first-blood"],
    ["kev_allin", "all-in"],
    ["sam_underdog", "longshot"],
    ["professional_risktaker", "combi-king"],
    ["lars_grinder", "iron-bankroll"],
  ];
  const allBadges = await db.query.badges.findMany({
    where: inArray(
      badges.slug,
      badgeGrants.map(([, slug]) => slug)
    ),
  });
  for (const [username, slug] of badgeGrants) {
    const userId = idByUsername.get(username);
    const badge = allBadges.find((b) => b.slug === slug);
    if (!userId || !badge) continue;
    await db
      .insert(userBadges)
      .values({ userId, badgeId: badge.id, challengeId: challenge.id })
      .onConflictDoNothing();
  }

  void like;

  console.log(`\n${created} bets aangemaakt over ${DAYS} dagen.`);
  console.log("Eindstand:");
  for (const r of [...rows].sort((a, b) => b.balance - a.balance)) {
    console.log(`  ${r.username.padEnd(24)} €${r.balance.toLocaleString("nl-NL")}`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
