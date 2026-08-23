// Creates or updates the referral mission ladder from REFERRAL_TIERS.
// Idempotent: matched on the tier's count, so re-running keeps one mission per
// tier instead of piling up duplicates.
//
//   npm run db:seed-referrals
import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { and, eq, isNull } = await import("drizzle-orm");
  const { db } = await import("../src/lib/db");
  const { missions } = await import("../drizzle/schema");
  const { REFERRAL_TIERS } = await import("../src/lib/referrals/tiers");

  const existing = await db.query.missions.findMany({
    where: and(eq(missions.type, "referrals"), isNull(missions.challengeId)),
  });

  for (const tier of REFERRAL_TIERS) {
    const title = tier.count === 1 ? "Breng er één mee" : `Breng er ${tier.count} mee`;
    const description =
      tier.count === 1
        ? "Nodig een speler uit die meedoet en zijn inleg betaalt."
        : `Nodig ${tier.count} spelers uit die meedoen en hun inleg betalen.`;

    const match = existing.find((m) => (m.params as { count?: number })?.count === tier.count);

    if (match) {
      await db
        .update(missions)
        .set({ title, description, rewardXp: tier.xp })
        .where(eq(missions.id, match.id));
      console.log(`bijgewerkt:  ${title} (${tier.xp} XP)`);
    } else {
      await db.insert(missions).values({
        // Career-wide: a referral never un-happens, so it never resets.
        challengeId: null,
        title,
        description,
        type: "referrals",
        params: { count: tier.count },
        rewardXp: tier.xp,
        appliesTo: "both",
      });
      console.log(`aangemaakt:  ${title} (${tier.xp} XP)`);
    }
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
