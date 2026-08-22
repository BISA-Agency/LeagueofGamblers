// Captures the app for the landing page (§10) against the seeded demo state.
// Run the dev (or a production) server first, then:
//
//   npm run db:seed && npm run db:seed-sportsbook && npm run db:seed-demo-state
//   npm run screenshots
//
// Shoots as a demo player, never a real account, so nothing personal ends up
// in /public. Output: public/screenshots/<name>-{mobile,desktop}.png
import { config } from "dotenv";
config({ path: ".env.local" });

import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.SCREENSHOT_BASE_URL ?? "http://localhost:3000";
const DEMO_EMAIL = "demo.mo@league-of-gamblers.test";
const OUT_DIR = path.join(process.cwd(), "public", "screenshots");

type Shot = { name: string; path: string; full?: boolean; wait?: string };

const SHOTS: Shot[] = [
  { name: "home", path: "/app" },
  { name: "sportsbook", path: "/app/sportsbook" },
  { name: "leaderboard", path: "/app/leaderboard" },
  { name: "challenge", path: "/app/challenge/demo" },
  { name: "missions", path: "/app/missions" },
  { name: "bets", path: "/app/bets" },
  { name: "profile", path: "/app/profile/mo_sharp" },
];

async function main() {
  const { createClient } = await import("@supabase/supabase-js");
  const { chromium } = await import("playwright");
  const { db } = await import("../src/lib/db");

  await mkdir(OUT_DIR, { recursive: true });

  // One event detail page, whichever fixture the seed produced first.
  const firstEvent = await db.query.events.findFirst({
    orderBy: (e, { asc }) => asc(e.startsAt),
    columns: { id: true },
  });
  const shots = firstEvent
    ? [...SHOTS, { name: "event", path: `/app/sportsbook/${firstEvent.id}` }]
    : SHOTS;

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  // A magic-link token is single-use, so every browser context needs its own —
  // reusing one silently lands the second pass on /login.
  const freshLoginUrl = async () => {
    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: DEMO_EMAIL,
      options: { redirectTo: `${BASE}/auth/confirm` },
    });
    if (error) throw error;
    return `${BASE}/auth/confirm?token_hash=${data.properties.hashed_token}&type=magiclink&next=/app`;
  };

  const browser = await chromium.launch();

  for (const viewport of [
    // 2x is already ~2.8x the 280px slot the landing page renders them in;
    // 3x only made the files bigger.
    { label: "mobile", width: 390, height: 844, scale: 2 },
    { label: "desktop", width: 1440, height: 900, scale: 2 },
  ]) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: viewport.scale,
      colorScheme: "dark",
      locale: "nl-NL",
      timezoneId: "Europe/Amsterdam",
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => console.log(`PAGE ERROR (${viewport.label}):`, e.message));

    await page.goto(await freshLoginUrl(), { waitUntil: "networkidle" });
    if (new URL(page.url()).pathname.startsWith("/login")) {
      throw new Error("Inloggen mislukt — screenshots zouden de loginpagina tonen.");
    }

    for (const shot of shots) {
      await page.goto(`${BASE}${shot.path}`, { waitUntil: "networkidle" });
      // Recharts animates in; give it a beat so the field chart isn't caught
      // mid-draw.
      await page.waitForTimeout(700);
      const file = path.join(OUT_DIR, `${shot.name}-${viewport.label}.png`);
      await page.screenshot({ path: file, fullPage: shot.full ?? false });
      console.log(`✓ ${shot.name} (${viewport.label})`);
    }

    await context.close();
  }

  await browser.close();
  console.log(`\nKlaar — ${shots.length * 2} screenshots in public/screenshots/`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
