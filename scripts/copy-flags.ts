// Copies the SVG flags for the countries we actually offer out of
// country-flag-icons and into public/flags/. Windows renders the flag emoji
// as two letters (NL) rather than a flag — a deliberate Microsoft choice — so
// the app ships real images instead.
//
//   npm run flags
//
// country-flag-icons stays a devDependency: nothing imports it at runtime,
// the committed SVGs are the artifact. Re-run after editing COUNTRY_OPTIONS.
import { copyFile, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";

const SRC_DIR = path.join(process.cwd(), "node_modules", "country-flag-icons", "3x2");
const OUT_DIR = path.join(process.cwd(), "public", "flags");

async function main() {
  const { COUNTRY_OPTIONS } = await import("../src/lib/countries");
  // The sportsbook needs a few flags the profile picker does not offer, so
  // football can be filed by home nation rather than by sovereign state.
  const { SUBDIVISION_FLAGS } = await import("../src/lib/sportsbook/competitions");
  const extra = Object.keys(SUBDIVISION_FLAGS);

  await mkdir(OUT_DIR, { recursive: true });

  // Drop anything no longer in the list, so removing a country doesn't leave
  // an orphan file behind.
  const existing = await readdir(OUT_DIR).catch(() => [] as string[]);
  const wanted = new Set([
    ...COUNTRY_OPTIONS.map((c) => `${c.code.toLowerCase()}.svg`),
    ...extra.map((code) => `${code}.svg`),
  ]);
  for (const file of existing) {
    // Only .svg: LICENSE.txt has to survive.
    if (file.endsWith(".svg") && !wanted.has(file)) await rm(path.join(OUT_DIR, file));
  }

  let copied = 0;
  const missing: string[] = [];

  for (const code of [...COUNTRY_OPTIONS.map((c) => c.code), ...extra]) {
    const from = path.join(SRC_DIR, `${code.toUpperCase()}.svg`);
    const to = path.join(OUT_DIR, `${code.toLowerCase()}.svg`);
    try {
      await copyFile(from, to);
      copied += 1;
    } catch {
      missing.push(code);
    }
  }

  // These SVGs ship to every visitor, so the MIT notice ships with them.
  await copyFile(
    path.join(process.cwd(), "node_modules", "country-flag-icons", "LICENSE"),
    path.join(OUT_DIR, "LICENSE.txt")
  );

  console.log(`${copied} vlaggen gekopieerd naar public/flags/`);
  if (missing.length > 0) {
    console.error(`Geen SVG gevonden voor: ${missing.join(", ")}`);
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
