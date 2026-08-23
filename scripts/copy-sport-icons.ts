// Copies the Tabler outline SVGs for the sports we actually label into
// public/sports/. They are rendered as CSS masks, not <img>, so they take the
// surrounding text colour — Tabler ships stroke="currentColor", which an <img>
// would resolve to black and lose on a dark background.
//
//   npm run sport-icons
//
// @tabler/icons stays a devDependency: nothing imports it at runtime, the
// committed SVGs are the artifact. Re-run after editing SPORT_ICONS.
import { copyFile, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";

const SRC_DIR = path.join(process.cwd(), "node_modules", "@tabler", "icons", "icons", "outline");
const OUT_DIR = path.join(process.cwd(), "public", "sports");

async function main() {
  const { SPORT_ICONS, sportIconSlug } = await import("../src/lib/sportsbook/sport-icons");

  await mkdir(OUT_DIR, { recursive: true });

  const wanted = new Map(
    Object.entries(SPORT_ICONS).map(([label, icon]) => [`${sportIconSlug(label)}.svg`, icon])
  );

  // Drop orphans so removing a sport doesn't leave a stale file behind.
  // Only .svg: LICENSE.txt has to survive.
  for (const file of await readdir(OUT_DIR).catch(() => [] as string[])) {
    if (file.endsWith(".svg") && !wanted.has(file)) await rm(path.join(OUT_DIR, file));
  }

  const missing: string[] = [];
  for (const [fileName, icon] of wanted) {
    try {
      await copyFile(path.join(SRC_DIR, `${icon}.svg`), path.join(OUT_DIR, fileName));
    } catch {
      missing.push(icon);
    }
  }

  // These SVGs ship to every visitor, so Tabler's MIT notice ships with them.
  await copyFile(
    path.join(process.cwd(), "node_modules", "@tabler", "icons", "LICENSE"),
    path.join(OUT_DIR, "LICENSE.txt")
  );

  console.log(`${wanted.size - missing.length} sporticonen gekopieerd naar public/sports/`);
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
