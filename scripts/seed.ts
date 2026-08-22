// Demo data for local testing: 1 live challenge, 8 players (6 paid, 2 unpaid),
// the default prize-tier staffel, the system badge set, and 3 sample
// missions. Run with: npm run db:seed
//
// Not seeded: sportsbook events/odds (never call The Odds API from here —
// use the admin's "Week importeren" or "Custom event" instead) and bet
// history (fabricating realistic settled bets added little value for the
// time it costs — use the app itself to generate real ones).
import { config } from "dotenv";
config({ path: ".env.local" });

type DemoUser = { username: string; email: string; paid: boolean };

const DEMO_USERS: DemoUser[] = [
  { username: "mo_sharp", email: "demo.mo@league-of-gamblers.test", paid: true },
  { username: "kev_allin", email: "demo.kev@league-of-gamblers.test", paid: true },
  { username: "sam_underdog", email: "demo.sam@league-of-gamblers.test", paid: true },
  { username: "dani_combi", email: "demo.dani@league-of-gamblers.test", paid: true },
  { username: "lars_grinder", email: "demo.lars@league-of-gamblers.test", paid: true },
  { username: "noor_streak", email: "demo.noor@league-of-gamblers.test", paid: true },
  { username: "finn_lastminute", email: "demo.finn@league-of-gamblers.test", paid: false },
  { username: "roos_newbie", email: "demo.roos@league-of-gamblers.test", paid: false },
];

// §5.2's default staffel.
const PRIZE_TIERS = [
  { minPlayers: 2, maxPlayers: 6, label: "2-6 spelers", split: [{ rank: 1, percent: 100 }] },
  {
    minPlayers: 7,
    maxPlayers: 15,
    label: "7-15 spelers",
    split: [
      { rank: 1, percent: 50 },
      { rank: 2, percent: 30 },
      { rank: 3, percent: 20 },
    ],
  },
];

// §5.8's seed set.
const BADGES = [
  { slug: "challenge-winner", name: "Challenge Winner", description: "Een hele challenge gewonnen.", icon: "crown", rarity: "legendary" as const },
  { slug: "podium", name: "Podium", description: "2e of 3e geëindigd in een challenge.", icon: "award", rarity: "epic" as const },
  { slug: "longshot", name: "Longshot", description: "Een bet gewonnen met odds ≥ 20.", icon: "target", rarity: "epic" as const },
  { slug: "iron-bankroll", name: "Iron Bankroll", description: "Een challenge uitgespeeld zonder ooit onder 50% van het startsaldo te komen.", icon: "shield", rarity: "rare" as const },
  { slug: "hot-streak", name: "Hot Streak", description: "5 bets op rij gewonnen.", icon: "flame", rarity: "rare" as const },
  { slug: "combi-king", name: "Combi King", description: "Een combi van 5+ selecties gewonnen.", icon: "sparkles", rarity: "rare" as const },
  { slug: "sharp", name: "Sharp", description: "Winrate ≥ 60% bij 20+ bets in één challenge.", icon: "trending-up", rarity: "epic" as const },
  { slug: "first-blood", name: "First Blood", description: "Eerste winnende gesettelde bet van de challenge.", icon: "zap", rarity: "common" as const },
  { slug: "comeback", name: "Comeback", description: "Van laatste plaats naar top 3.", icon: "rocket", rarity: "epic" as const },
  { slug: "all-in", name: "All-in", description: "Een all-in bet gewonnen.", icon: "flame", rarity: "rare" as const },
  { slug: "bust", name: "Bust", description: "Saldo op €0 gekomen.", icon: "skull", rarity: "common" as const },
  { slug: "veteran", name: "Veteran", description: "3 challenges gespeeld.", icon: "shield-check", rarity: "rare" as const },
  { slug: "scout", name: "Scout", description: "5 verschillende sporten gespeeld.", icon: "star", rarity: "common" as const },
  { slug: "clean-sheet", name: "Clean Sheet", description: "10 bewijsbets goedgekeurd zonder één afkeuring.", icon: "shield-check", rarity: "rare" as const },
];

async function main() {
  // Dynamic imports: these modules read process.env at load time, so they
  // must come after dotenv has populated it above.
  const { createClient } = await import("@supabase/supabase-js");
  const { db } = await import("../src/lib/db");
  const { badges, challengeParticipants, challenges, missions, prizeTiers, profiles, userBadges } =
    await import("../drizzle/schema");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY zijn verplicht om te seeden."
    );
  }

  const supabaseAdmin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("Demo-challenge aanmaken...");
  const now = new Date();
  const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [inserted] = await db
    .insert(challenges)
    .values({
      name: "Demo Challenge",
      slug: "demo",
      descriptionMd: "Een demo-challenge om de app mee te testen en de landingspagina-screenshots mee te maken.",
      startAt: now,
      endAt: end,
      status: "live",
      startingBalance: 10000,
      buyInAmount: 100,
    })
    .onConflictDoNothing({ target: challenges.slug })
    .returning();

  const challenge =
    inserted ??
    (await db.query.challenges.findFirst({ where: (c, { eq }) => eq(c.slug, "demo") }));
  if (!challenge) throw new Error("Kon demo-challenge niet aanmaken of vinden.");

  const userIdByUsername = new Map<string, string>();

  for (const demo of DEMO_USERS) {
    console.log(`Speler ${demo.username} aanmaken...`);

    let userId: string;
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: demo.email,
      email_confirm: true,
    });

    if (createError || !created?.user) {
      const { data: list, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) throw listError;
      const existing = list.users.find((u) => u.email === demo.email);
      if (!existing) throw createError ?? new Error(`Kon ${demo.email} niet aanmaken of vinden.`);
      userId = existing.id;
    } else {
      userId = created.user.id;
    }
    userIdByUsername.set(demo.username, userId);

    await db
      .insert(profiles)
      .values({ id: userId, username: demo.username, rulesAcceptedAt: new Date() })
      .onConflictDoUpdate({ target: profiles.id, set: { username: demo.username } });

    await db
      .insert(challengeParticipants)
      .values({
        challengeId: challenge.id,
        userId,
        balance: 10000,
        status: "active",
        paidBuyIn: demo.paid,
        paidAt: demo.paid ? new Date() : null,
      })
      .onConflictDoNothing();
  }

  console.log("Prize tiers seeden...");
  for (const tier of PRIZE_TIERS) {
    const existing = await db.query.prizeTiers.findFirst({
      where: (t, { eq }) => eq(t.label, tier.label),
    });
    if (!existing) await db.insert(prizeTiers).values(tier);
  }

  console.log("Badges seeden...");
  for (const badge of BADGES) {
    await db.insert(badges).values(badge).onConflictDoUpdate({
      target: badges.slug,
      set: { name: badge.name, description: badge.description, icon: badge.icon, rarity: badge.rarity },
    });
  }

  console.log("Demo-missies aanmaken...");
  const sampleMissions = [
    {
      challengeId: challenge.id,
      title: "Longshot",
      description: "Win een bet met quotering ≥ 20.",
      type: "win_odds_min",
      params: { minOdds: 20 },
      rewardXp: 50,
    },
    {
      challengeId: challenge.id,
      title: "Hot Streak",
      description: "Win 5 bets op rij.",
      type: "win_streak",
      params: { count: 5 },
      rewardXp: 75,
    },
    {
      challengeId: challenge.id,
      title: "Combi King",
      description: "Win een combi van 4 of meer selecties.",
      type: "combi_win",
      params: { minSelections: 4 },
      rewardAmount: 5,
      rewardXp: 50,
    },
  ];
  for (const mission of sampleMissions) {
    const existing = await db.query.missions.findFirst({
      where: (m, { and: andOp, eq: eqOp }) =>
        andOp(eqOp(m.challengeId, challenge.id), eqOp(m.title, mission.title)),
    });
    if (!existing) await db.insert(missions).values(mission);
  }

  console.log("Voorbeeldbadges toekennen...");
  const firstBlood = await db.query.badges.findFirst({ where: (b, { eq }) => eq(b.slug, "first-blood") });
  const veteran = await db.query.badges.findFirst({ where: (b, { eq }) => eq(b.slug, "veteran") });
  const moId = userIdByUsername.get("mo_sharp");
  const kevId = userIdByUsername.get("kev_allin");
  if (firstBlood && moId) {
    await db.insert(userBadges).values({ userId: moId, badgeId: firstBlood.id, challengeId: challenge.id }).onConflictDoNothing();
  }
  if (veteran && kevId) {
    await db.insert(userBadges).values({ userId: kevId, badgeId: veteran.id }).onConflictDoNothing();
  }

  console.log("Klaar. Demo-challenge: /c/demo — log in als een van de demo.*@league-of-gamblers.test adressen.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
