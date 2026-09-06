// Downloads club crests once and commits them, the same arrangement as the
// flags and the sport icons: the files are the artifact, the fetch is a build
// step nobody runs at request time.
//
//   npm run crests
//
// Needs FOOTBALL_DATA_TOKEN in .env.local (free key from football-data.org).
// Re-run after enabling new competitions; files already present are left
// alone, so a second run only fetches what is new.
import { config } from "dotenv";
config({ path: ".env.local" });

import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const OUT_DIR = path.join(process.cwd(), "public", "crests");
const INDEX_FILE = path.join(process.cwd(), "src", "lib", "sportsbook", "crests.ts");
const API = "https://api.football-data.org/v4";
/** The free tier allows ten calls a minute; seven seconds apart sits under it. */
const DELAY_MS = 7000;
/**
 * What we store, not what they send.
 *
 * football-data serves 200 px crests of up to 120 kB; the badge draws them at
 * 22. Two hundred of those would have cost more than the entire sportsbook
 * page does, so each one is resized to 64 (enough for a retina 32) and written
 * as WebP — around a kilobyte apiece, transparency intact.
 */
const CREST_PX = 64;

/**
 * Our sport keys to football-data's competition codes.
 *
 * Only what its free tier covers. MLS, the second divisions and the Turkish
 * league are not in it, so those clubs keep the lettered badge — the same one
 * every tennis player and boxer gets, which reads as deliberate rather than
 * broken.
 */
const COMPETITIONS: Record<string, string> = {
  soccer_epl: "PL",
  soccer_efl_champ: "ELC",
  soccer_germany_bundesliga: "BL1",
  soccer_italy_serie_a: "SA",
  soccer_spain_la_liga: "PD",
  soccer_france_ligue_one: "FL1",
  soccer_netherlands_eredivisie: "DED",
  soccer_portugal_primeira_liga: "PPL",
  soccer_brazil_campeonato: "BSA",
  soccer_uefa_champs_league: "CL",
};

/**
 * Names the token matching cannot bridge on its own.
 *
 * "FC Twente Enschede" and "FC Twente '65" share one word out of two, which is
 * also true of Real Madrid and Real Sociedad — so the matcher stays strict and
 * the handful it misses are listed here by hand.
 */
const ALIASES: Record<string, string> = {
  "FC Twente Enschede": "Twente",
  "Sparta Rotterdam": "Sparta",
  "SC Telstar": "Telstar",
  "NEC Nijmegen": "NEC",
  // Clubs football-data files under a name that shares no word with the one
  // the odds feed sends us.
  "AEK Athens": "PAE AEK",
  "Sporting Lisbon": "Sporting CP",
  Rennes: "Stade Rennais",
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Words that say nothing about which club this is. */
const NOISE = new Set([
  "fc", "sc", "sv", "cf", "ac", "as", "ss", "ssc", "afc", "cd", "ud", "rc", "sk",
  "bk", "if", "fk", "tsg", "vfl", "vfb", "bv", "sd", "rcd", "club", "de", "the",
  "calcio", "futebol", "clube", "football",
]);

function tokens(name: string): Set<string> {
  return new Set(
    slugify(name)
      .split("-")
      .filter((word) => word.length > 0 && !NOISE.has(word))
  );
}

const isSubset = (a: Set<string>, b: Set<string>) => [...a].every((x) => b.has(x));

/**
 * Matches only when one name's distinctive words sit entirely inside the
 * other's. "PSV" fits inside "PSV Eindhoven"; "Real Madrid" does not fit
 * inside "Real Sociedad", which is exactly the pair a looser rule gets wrong.
 */
function matches(ours: string, theirs: string[]): boolean {
  const mine = tokens(ours);
  if (mine.size === 0) return false;
  return theirs.some((name) => {
    const other = tokens(name);
    if (other.size === 0) return false;
    return isSubset(mine, other) || isSubset(other, mine);
  });
}

type Team = { name: string; shortName?: string; tla?: string; crest?: string };

async function main() {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) throw new Error("FOOTBALL_DATA_TOKEN ontbreekt in .env.local");

  const { db } = await import("../src/lib/db");
  const { events } = await import("../drizzle/schema");
  const { inArray } = await import("drizzle-orm");

  await mkdir(OUT_DIR, { recursive: true });
  const have = new Set(
    (await readdir(OUT_DIR).catch(() => [] as string[]))
      .filter((f) => f.endsWith(".webp"))
      .map((f) => f.replace(/\.webp$/, ""))
  );

  const rows = await db
    .selectDistinct({ sportKey: events.sportKey, home: events.homeTeam, away: events.awayTeam })
    .from(events)
    .where(inArray(events.sportKey, Object.keys(COMPETITIONS)));

  // Grouped per competition, because that is how they are fetched: one call
  // returns a league's clubs, and a team is only looked for among its own.
  const byCompetition = new Map<string, Set<string>>();
  for (const row of rows) {
    const set = byCompetition.get(row.sportKey) ?? new Set<string>();
    if (row.home) set.add(row.home);
    if (row.away) set.add(row.away);
    byCompetition.set(row.sportKey, set);
  }

  const missing: string[] = [];
  let fetched = 0;

  for (const [sportKey, ourTeams] of byCompetition) {
    const code = COMPETITIONS[sportKey];
    const res = await fetch(`${API}/competitions/${code}/teams`, {
      headers: { "X-Auth-Token": token },
    });
    if (!res.ok) {
      console.error(`  ${code}: HTTP ${res.status}`);
      await new Promise((r) => setTimeout(r, DELAY_MS));
      continue;
    }
    const theirTeams = ((await res.json()) as { teams?: Team[] }).teams ?? [];
    console.log(`${code}: ${theirTeams.length} clubs opgehaald, ${ourTeams.size} bij ons`);

    for (const ours of ourTeams) {
      const slug = slugify(ours);
      if (have.has(slug)) continue;

      const alias = ALIASES[ours];
      const hit = theirTeams.find((t) =>
        alias
          ? [t.name, t.shortName, t.tla].some((n) => n && slugify(n) === slugify(alias))
          : matches(ours, [t.name, t.shortName].filter(Boolean) as string[])
      );

      if (!hit?.crest) {
        missing.push(`${ours} (${code})`);
        continue;
      }

      const img = await fetch(hit.crest);
      if (!img.ok) {
        missing.push(`${ours} (${code}, download ${img.status})`);
        continue;
      }
      const small = await sharp(Buffer.from(await img.arrayBuffer()))
        .resize(CREST_PX, CREST_PX, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ quality: 90 })
        .toBuffer();
      await writeFile(path.join(OUT_DIR, `${slug}.webp`), small);
      have.add(slug);
      fetched += 1;
    }

    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  const slugs = [...have].sort();
  await writeFile(
    INDEX_FILE,
    `// Generated by scripts/fetch-crests.ts — do not edit by hand.
//
// Which crests public/crests/ actually holds. The badge component checks this
// rather than pointing an <img> at a file that may not exist: a broken image
// on every unknown club would look far worse than the lettered square it
// falls back to.
export const CREST_SLUGS = new Set<string>([
${slugs.map((s) => `  ${JSON.stringify(s)},`).join("\n")}
]);
`,
    "utf8"
  );

  console.log(`\n${fetched} nieuwe emblemen, ${slugs.length} in totaal.`);
  if (missing.length > 0) {
    console.log(`\nNiet gevonden (${missing.length}):`);
    console.log(missing.map((m) => `  ${m}`).join("\n"));
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
