// Fills the demo challenge's sportsbook with fake-but-plausible fixtures so
// the betting loop can be exercised without spending Odds API credits. Also
// used later for the landing-page screenshots (§10).
//
//   npm run db:seed-sportsbook                     add the fixtures
//   npm run db:seed-sportsbook -- --clean          remove them again
//   npm run db:seed-sportsbook -- --slug=my-slug   target another challenge
//
// Everything it creates is marked source "admin" with an external_id prefixed
// "demo-", so --clean can find its own rows and nothing else.
import { config } from "dotenv";
config({ path: ".env.local" });

const DEFAULT_SLUG = "demo";
const PREFIX = "demo-";

type Fixture = {
  id: string;
  competition: string;
  sportKey: string;
  sportLabel: string;
  home: string;
  away: string;
  /** Days from now the match kicks off. */
  inDays: number;
  h2h: [number, number, number];
  total?: { line: number; over: number; under: number };
  spread?: { line: number; home: number; away: number };
};

const FIXTURES: Fixture[] = [
  {
    id: "aja-psv",
    competition: "Eredivisie",
    sportKey: "soccer_netherlands_eredivisie",
    sportLabel: "Voetbal",
    home: "Ajax",
    away: "PSV",
    inDays: 2,
    h2h: [2.4, 3.5, 2.75],
    total: { line: 2.5, over: 1.65, under: 2.25 },
    spread: { line: -0.5, home: 2.4, away: 1.6 },
  },
  {
    id: "fey-az",
    competition: "Eredivisie",
    sportKey: "soccer_netherlands_eredivisie",
    sportLabel: "Voetbal",
    home: "Feyenoord",
    away: "AZ",
    inDays: 3,
    h2h: [1.85, 3.8, 4.0],
    total: { line: 3.5, over: 2.1, under: 1.72 },
  },
  {
    id: "twe-utr",
    competition: "Eredivisie",
    sportKey: "soccer_netherlands_eredivisie",
    sportLabel: "Voetbal",
    home: "FC Twente",
    away: "FC Utrecht",
    inDays: 4,
    h2h: [2.1, 3.4, 3.3],
    total: { line: 2.5, over: 1.8, under: 2.0 },
  },
  {
    id: "ars-liv",
    competition: "Premier League",
    sportKey: "soccer_epl",
    sportLabel: "Voetbal",
    home: "Arsenal",
    away: "Liverpool",
    inDays: 5,
    h2h: [2.6, 3.6, 2.5],
    total: { line: 3.5, over: 2.0, under: 1.8 },
    spread: { line: -0.25, home: 2.05, away: 1.8 },
  },
  {
    id: "rma-fcb",
    competition: "La Liga",
    sportKey: "soccer_spain_la_liga",
    sportLabel: "Voetbal",
    home: "Real Madrid",
    away: "FC Barcelona",
    inDays: 6,
    h2h: [2.2, 3.7, 2.9],
    total: { line: 3.5, over: 1.95, under: 1.85 },
  },
  {
    id: "lakers-celtics",
    competition: "NBA",
    sportKey: "basketball_nba",
    sportLabel: "Basketbal",
    home: "LA Lakers",
    away: "Boston Celtics",
    inDays: 2,
    h2h: [2.05, 0, 1.8],
    total: { line: 221.5, over: 1.9, under: 1.9 },
    spread: { line: -2.5, home: 1.95, away: 1.87 },
  },
  {
    id: "alcaraz-sinner",
    competition: "ATP",
    sportKey: "tennis_atp_singles",
    sportLabel: "Tennis",
    home: "Carlos Alcaraz",
    away: "Jannik Sinner",
    inDays: 3,
    h2h: [1.95, 0, 1.85],
  },
  {
    id: "outsider-cup",
    competition: "Champions League",
    sportKey: "soccer_uefa_champs_league",
    sportLabel: "Voetbal",
    home: "Sparta Praag",
    away: "Manchester City",
    inDays: 7,
    // A deliberate longshot so the Longshot badge / high-odds missions are
    // reachable while testing.
    h2h: [23.0, 9.5, 1.08],
  },
];

async function main() {
  const clean = process.argv.includes("--clean");
  const slug =
    process.argv.find((a) => a.startsWith("--slug="))?.slice("--slug=".length) ?? DEFAULT_SLUG;

  const { and, eq, like } = await import("drizzle-orm");
  const { db } = await import("../src/lib/db");
  const { challenges, events, markets, outcomes } = await import("../drizzle/schema");

  const challenge = await db.query.challenges.findFirst({
    where: eq(challenges.slug, slug),
  });
  if (!challenge) throw new Error(`Challenge "${slug}" niet gevonden — draai eerst db:seed.`);

  if (clean) {
    // markets/outcomes cascade from events.
    const removed = await db
      .delete(events)
      .where(and(eq(events.challengeId, challenge.id), like(events.externalId, `${PREFIX}%`)))
      .returning({ id: events.id });
    console.log(`${removed.length} demo-events verwijderd.`);
    process.exit(0);
  }

  const now = Date.now();
  let created = 0;

  for (const f of FIXTURES) {
    const [event] = await db
      .insert(events)
      .values({
        challengeId: challenge.id,
        source: "admin",
        externalId: `${PREFIX}${f.id}`,
        sportKey: f.sportKey,
        sportLabel: f.sportLabel,
        competition: f.competition,
        homeTeam: f.home,
        awayTeam: f.away,
        name: `${f.home} - ${f.away}`,
        startsAt: new Date(now + f.inDays * 86_400_000),
        status: "upcoming",
      })
      .onConflictDoNothing({ target: [events.challengeId, events.externalId] })
      .returning();

    if (!event) {
      console.log(`- ${f.home} - ${f.away} bestond al, overgeslagen`);
      continue;
    }

    const [h2hMarket] = await db
      .insert(markets)
      .values({ eventId: event.id, type: "h2h", label: "1X2", status: "open" })
      .returning();

    const [home, draw, away] = f.h2h;
    await db.insert(outcomes).values(
      [
        { marketId: h2hMarket.id, label: f.home, odds: home },
        // Basketball and tennis have no draw.
        ...(draw > 0 ? [{ marketId: h2hMarket.id, label: "Gelijkspel", odds: draw }] : []),
        { marketId: h2hMarket.id, label: f.away, odds: away },
      ].filter(Boolean)
    );

    if (f.total) {
      const [totalsMarket] = await db
        .insert(markets)
        .values({
          eventId: event.id,
          type: "totals",
          label: "Over/Under",
          line: f.total.line,
          status: "open",
        })
        .returning();
      await db.insert(outcomes).values([
        { marketId: totalsMarket.id, label: `Over ${f.total.line}`, odds: f.total.over },
        { marketId: totalsMarket.id, label: `Under ${f.total.line}`, odds: f.total.under },
      ]);
    }

    if (f.spread) {
      const [spreadMarket] = await db
        .insert(markets)
        .values({
          eventId: event.id,
          type: "spreads",
          label: "Handicap",
          line: f.spread.line,
          status: "open",
        })
        .returning();
      await db.insert(outcomes).values([
        { marketId: spreadMarket.id, label: `${f.home} ${f.spread.line}`, odds: f.spread.home },
        { marketId: spreadMarket.id, label: `${f.away} ${-f.spread.line}`, odds: f.spread.away },
      ]);
    }

    created += 1;
    console.log(`+ ${f.home} - ${f.away} (${f.competition}, over ${f.inDays} dagen)`);
  }

  console.log(`\n${created} demo-events aangemaakt. Verwijderen kan met --clean.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
