// Demo data for local testing: 1 live challenge, 8 players (6 paid, 2 unpaid).
// Run with: npm run db:seed
//
// v1 only — events, sportsbook/proof bets, missions and badges are seeded
// once their schemas land in Fase 1 (see PLAN.md).
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

async function main() {
  // Dynamic imports: these modules read process.env at load time, so they
  // must come after dotenv has populated it above.
  const { createClient } = await import("@supabase/supabase-js");
  const { db } = await import("../src/lib/db");
  const { challenges, challengeParticipants, profiles } = await import("../drizzle/schema");

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

  console.log("Klaar. Demo-challenge: /c/demo — log in als een van de demo.*@league-of-gamblers.test adressen.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
