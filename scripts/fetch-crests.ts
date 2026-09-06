// Downloads club crests once and commits them, the same arrangement as the
// flags and the sport icons: the files are the artifact, the fetch is a build
// step nobody runs at request time.
//
//   npm run crests
//
// Needs FOOTBALL_DATA_TOKEN and API_FOOTBALL_KEY in .env.local (both free).
// Re-run after enabling new competitions; files already present are left
// alone, so a second run only asks for what is new — which matters, because
// one of the two sources allows a hundred requests a day.
import { config } from "dotenv";
config({ path: ".env.local" });

import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const OUT_DIR = path.join(process.cwd(), "public", "crests");
const INDEX_FILE = path.join(process.cwd(), "src", "lib", "sportsbook", "crests.ts");
const FOOTBALL_DATA = "https://api.football-data.org/v4";
const API_FOOTBALL = "https://v3.football.api-sports.io";
/** Both free tiers allow ten calls a minute; seven seconds apart sits under it. */
const DELAY_MS = 7000;
/**
 * What we store, not what they send.
 *
 * The sources serve crests of up to 120 kB; the badge draws them at 22 px.
 * Two hundred of those would have cost more than the entire sportsbook page
 * does, so each one is resized to 64 (enough for a retina 32) and written as
 * WebP — around three kilobytes apiece, transparency intact.
 */
const CREST_PX = 64;

/**
 * Every competition we can get crests for, and where from.
 *
 * football-data.org is the better source but its whole catalogue is thirteen
 * competitions, ten of which we use. Everything else — MLS, the Turkish league,
 * the second divisions — comes from API-Football, whose coverage is far wider
 * and whose free tier stops at season 2024. That cutoff is why the search pass
 * below exists.
 *
 * `country` is only used to disambiguate that search: it must match the
 * country name API-Football puts on a team, not our own flag codes. Null means
 * supranational, where filtering by country would throw away the right answer.
 */
type Competition =
  | { source: "football-data"; code: string; country: string | null }
  | { source: "api-football"; id: number; season: number; country: string | null };

const COMPETITIONS: Record<string, Competition> = {
  soccer_epl: { source: "football-data", code: "PL", country: "England" },
  soccer_efl_champ: { source: "football-data", code: "ELC", country: "England" },
  soccer_germany_bundesliga: { source: "football-data", code: "BL1", country: "Germany" },
  soccer_italy_serie_a: { source: "football-data", code: "SA", country: "Italy" },
  soccer_spain_la_liga: { source: "football-data", code: "PD", country: "Spain" },
  soccer_france_ligue_one: { source: "football-data", code: "FL1", country: "France" },
  soccer_netherlands_eredivisie: { source: "football-data", code: "DED", country: "Netherlands" },
  soccer_portugal_primeira_liga: { source: "football-data", code: "PPL", country: "Portugal" },
  soccer_brazil_campeonato: { source: "football-data", code: "BSA", country: "Brazil" },
  soccer_uefa_champs_league: { source: "football-data", code: "CL", country: null },

  soccer_usa_mls: { source: "api-football", id: 253, season: 2024, country: "USA" },
  soccer_turkey_super_league: { source: "api-football", id: 203, season: 2024, country: "Turkey" },
  soccer_italy_serie_b: { source: "api-football", id: 136, season: 2024, country: "Italy" },
  soccer_spain_segunda_division: { source: "api-football", id: 141, season: 2024, country: "Spain" },
  soccer_germany_bundesliga2: { source: "api-football", id: 79, season: 2024, country: "Germany" },
  soccer_france_ligue_two: { source: "api-football", id: 62, season: 2024, country: "France" },
  soccer_italy_coppa_italia: { source: "api-football", id: 137, season: 2024, country: "Italy" },
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
  // Same problem at API-Football, plus the reserve sides: Spain enters them in
  // the second division under a name the first team's crest must not answer to.
  "LA Galaxy": "Los Angeles Galaxy",
  "D.C. United": "DC United",
  "Real Sociedad B": "Real Sociedad II",
  "Celta Fortuna": "Celta de Vigo II",
  // "BB" is Büyükşehir Belediyesi, which their name drops entirely.
  "Erzurum BB": "Erzurumspor FK",
  "Stade Lavallois": "Laval",
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

/** How a reserve side is marked, in either source's spelling. */
const RESERVE_MARKS = new Set(["b", "ii", "iii", "2", "fortuna", "castilla"]);

/**
 * Whether this is a club's second team.
 *
 * Spain enters reserve sides in the second division, and the subset rule below
 * happily reads "Real Sociedad" as a match for "Real Sociedad B" — which would
 * put the first team's crest on the wrong club and never say so. A wrong crest
 * is worse than no crest, so the two may not match each other.
 */
function isReserve(name: string): boolean {
  const parts = slugify(name).split("-");
  return RESERVE_MARKS.has(parts[parts.length - 1]);
}

/**
 * Matches only when one name's distinctive words sit entirely inside the
 * other's. "PSV" fits inside "PSV Eindhoven"; "Real Madrid" does not fit
 * inside "Real Sociedad", which is exactly the pair a looser rule gets wrong.
 */
function matches(ours: string, theirs: (string | undefined)[]): boolean {
  const mine = tokens(ours);
  if (mine.size === 0) return false;
  const oursIsReserve = isReserve(ours);
  return theirs.some((name) => {
    if (!name) return false;
    if (isReserve(name) !== oursIsReserve) return false;
    const other = tokens(name);
    if (other.size === 0) return false;
    return isSubset(mine, other) || isSubset(other, mine);
  });
}

/**
 * What to type into API-Football's search box.
 *
 * Their search is a plain substring match on the club's name, not a fuzzy one,
 * and it rejects anything but letters, digits and spaces. So "Girona FC" finds
 * nothing — no club is called that — while "girona" finds it, and "1. FC
 * Heidenheim" is refused outright. Sending the longest distinctive word solves
 * both: it is the part most likely to appear verbatim in their name.
 */
function searchTerm(name: string): string {
  const alias = ALIASES[name];
  if (alias) return alias.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const longest = [...tokens(name)].sort((a, b) => b.length - a.length)[0];
  return longest ?? slugify(name);
}

/** One club as either source describes it, reduced to what we need. */
type Candidate = { names: (string | undefined)[]; crest?: string; country?: string };

const sleep = () => new Promise((r) => setTimeout(r, DELAY_MS));

async function fromFootballData(code: string, token: string): Promise<Candidate[]> {
  const res = await fetch(`${FOOTBALL_DATA}/competitions/${code}/teams`, {
    headers: { "X-Auth-Token": token },
  });
  if (!res.ok) {
    console.error(`  ${code}: HTTP ${res.status}`);
    return [];
  }
  const teams =
    ((await res.json()) as { teams?: { name: string; shortName?: string; tla?: string; crest?: string }[] })
      .teams ?? [];
  return teams.map((t) => ({ names: [t.name, t.shortName, t.tla], crest: t.crest }));
}

type ApiFootballTeam = { team: { name: string; code?: string; logo?: string; country?: string } };

/** API-Football answers 200 with an errors object rather than a status code. */
async function apiFootball(query: string, key: string): Promise<Candidate[]> {
  const res = await fetch(`${API_FOOTBALL}/teams?${query}`, {
    headers: { "x-apisports-key": key },
  });
  const body = (await res.json()) as { response?: ApiFootballTeam[]; errors?: unknown };
  const errors = Array.isArray(body.errors) ? body.errors : Object.values(body.errors ?? {});
  if (errors.length > 0) {
    console.error(`  ${query}: ${JSON.stringify(errors)}`);
    return [];
  }
  return (body.response ?? []).map((t) => ({
    names: [t.team.name, t.team.code],
    crest: t.team.logo,
    country: t.team.country,
  }));
}

/** Resize, re-encode, write. Returns false when the download itself failed. */
async function save(slug: string, url: string): Promise<boolean> {
  const img = await fetch(url);
  if (!img.ok) return false;
  const small = await sharp(Buffer.from(await img.arrayBuffer()))
    .resize(CREST_PX, CREST_PX, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 90 })
    .toBuffer();
  await writeFile(path.join(OUT_DIR, `${slug}.webp`), small);
  return true;
}

async function main() {
  const fdToken = process.env.FOOTBALL_DATA_TOKEN;
  const afKey = process.env.API_FOOTBALL_KEY;

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
  // Anything already on disk drops out here, so a competition that is fully
  // covered costs no request at all.
  const wanted = new Map<string, string[]>();
  for (const row of rows) {
    for (const team of [row.home, row.away]) {
      if (!team || have.has(slugify(team))) continue;
      const list = wanted.get(row.sportKey) ?? [];
      if (!list.includes(team)) list.push(team);
      wanted.set(row.sportKey, list);
    }
  }

  const stillMissing: { name: string; sportKey: string }[] = [];
  let fetched = 0;

  for (const [sportKey, ourTeams] of wanted) {
    const competition = COMPETITIONS[sportKey];
    const label = competition.source === "football-data" ? competition.code : `#${competition.id}`;

    let theirs: Candidate[] = [];
    if (competition.source === "football-data") {
      if (!fdToken) {
        console.error(`${label}: overgeslagen, FOOTBALL_DATA_TOKEN ontbreekt`);
        continue;
      }
      theirs = await fromFootballData(competition.code, fdToken);
    } else {
      if (!afKey) {
        console.error(`${label}: overgeslagen, API_FOOTBALL_KEY ontbreekt`);
        continue;
      }
      theirs = await apiFootball(`league=${competition.id}&season=${competition.season}`, afKey);
    }
    console.log(`${label}: ${theirs.length} clubs opgehaald, ${ourTeams.length} gezocht`);

    for (const ours of ourTeams) {
      const alias = ALIASES[ours];
      const hit = theirs.find((t) =>
        alias
          ? t.names.some((n) => n && slugify(n) === slugify(alias))
          : matches(ours, t.names)
      );
      if (!hit?.crest) {
        stillMissing.push({ name: ours, sportKey });
        continue;
      }
      if (await save(slugify(ours), hit.crest)) {
        have.add(slugify(ours));
        fetched += 1;
      } else {
        stillMissing.push({ name: ours, sportKey });
      }
    }

    await sleep();
  }

  /**
   * One search per club still unaccounted for.
   *
   * API-Football's free tier only serves squads up to season 2024, so a club
   * promoted or founded since then is in none of the league lists — San Diego
   * FC joined MLS in 2025 and simply is not in the 2024 roster. Search is not
   * season-bound, so it finds them; it is one request a club, which is why it
   * runs last and only on the remainder.
   */
  const unresolved: string[] = [];
  if (afKey && stillMissing.length > 0) {
    console.log(`\nZoeken op naam voor ${stillMissing.length} clubs...`);
    for (const { name, sportKey } of stillMissing) {
      const country = COMPETITIONS[sportKey].country;
      const alias = ALIASES[name];
      const results = await apiFootball(`search=${encodeURIComponent(searchTerm(name))}`, afKey);
      const hit = results.find(
        (t) =>
          (!country || t.country === country) &&
          (alias
            ? t.names.some((n) => n && slugify(n) === slugify(alias))
            : matches(name, t.names))
      );
      if (hit?.crest && (await save(slugify(name), hit.crest))) {
        have.add(slugify(name));
        fetched += 1;
        console.log(`  gevonden: ${name}`);
      } else {
        unresolved.push(`${name} (${sportKey})`);
      }
      await sleep();
    }
  } else {
    unresolved.push(...stillMissing.map((m) => `${m.name} (${m.sportKey})`));
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
  if (unresolved.length > 0) {
    console.log(`\nNiet gevonden (${unresolved.length}):`);
    console.log(unresolved.map((m) => `  ${m}`).join("\n"));
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
