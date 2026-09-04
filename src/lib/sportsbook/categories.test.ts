import { describe, expect, it } from "vitest";
import { buildNav, filterEvents, filterHref, resolveFilter } from "./categories";

const NOW = new Date("2026-09-05T12:00:00Z");
const inHours = (h: number) => new Date(NOW.getTime() + h * 3_600_000);

const event = (sportKey: string, sportLabel: string, competition: string, hours: number) => ({
  sportKey,
  sportLabel,
  competition,
  startsAt: inHours(hours),
});

const EVENTS = [
  event("soccer_epl", "Voetbal", "EPL", 3),
  event("soccer_epl", "Voetbal", "EPL", 40),
  event("soccer_spain_la_liga", "Voetbal", "La Liga - Spain", 5),
  event("soccer_italy_serie_a", "Voetbal", "Serie A - Italy", 50),
  event("mma_mixed_martial_arts", "MMA", "MMA", 8),
];

describe("resolveFilter", () => {
  it("defaults to everything", () => {
    expect(resolveFilter(EVENTS, {})).toEqual({ sport: "alles", league: null, soon: false });
  });

  it("reads a sport and a league", () => {
    expect(resolveFilter(EVENTS, { s: "voetbal" })).toMatchObject({
      sport: "voetbal",
      league: null,
    });
    expect(resolveFilter(EVENTS, { l: "soccer_epl" })).toMatchObject({ league: "soccer_epl" });
  });

  // A shared link only ever carries ?l=, so the sport row still has to light up.
  it("derives the sport from the league", () => {
    expect(resolveFilter(EVENTS, { l: "mma_mixed_martial_arts" }).sport).toBe("mma");
  });

  // The old rail could point at a category the list no longer had; falling
  // back to everything means a stale link shows fixtures, not an empty page.
  it("ignores a sport or league that is not on offer", () => {
    expect(resolveFilter(EVENTS, { s: "curling", l: "soccer_nowhere" })).toEqual({
      sport: "alles",
      league: null,
      soon: false,
    });
  });
});

describe("buildNav", () => {
  const all = { sport: "alles", league: null, soon: false };

  it("counts sports, with Alles first", () => {
    const { sports } = buildNav(EVENTS, all, NOW);
    expect(sports[0]).toEqual({ key: "alles", label: "Alles", count: 5 });
    expect(sports.slice(1)).toEqual([
      { key: "voetbal", label: "Voetbal", count: 4 },
      { key: "mma", label: "MMA", count: 1 },
    ]);
  });

  it("shows only the leagues inside the chosen sport", () => {
    const { leagues } = buildNav(EVENTS, { ...all, sport: "voetbal" }, NOW);
    expect(leagues.every((l) => l.key.startsWith("soccer_"))).toBe(true);
  });

  // Boxing and MMA are their own only competition, so a chip for them would
  // repeat the sport tab verbatim, same name and same count.
  it("drops a league that is just its sport again", () => {
    expect(buildNav(EVENTS, all, NOW).leagues.map((l) => l.key)).not.toContain(
      "mma_mixed_martial_arts"
    );
    expect(buildNav(EVENTS, { ...all, sport: "mma" }, NOW).leagues).toEqual([]);
  });

  it("names and flags the leagues, biggest first", () => {
    const { leagues } = buildNav(EVENTS, { ...all, sport: "voetbal" }, NOW);
    expect(leagues).toEqual([
      { key: "soccer_epl", name: "Premier League", country: "gb", count: 2 },
      // Equal counts fall back to the name, so the order never wobbles.
      { key: "soccer_spain_la_liga", name: "LaLiga", country: "es", count: 1 },
      { key: "soccer_italy_serie_a", name: "Serie A", country: "it", count: 1 },
    ]);
  });

  // A chip that promises nine fixtures and delivers two is worse than no chip.
  it("counts within the 24-hour window when it is on", () => {
    const nav = buildNav(EVENTS, { ...all, soon: true }, NOW);
    expect(nav.sports[0].count).toBe(3);
    expect(nav.leagues.find((l) => l.key === "soccer_epl")?.count).toBe(1);
  });

  it("reports the soon count regardless of the active filter", () => {
    expect(buildNav(EVENTS, { ...all, sport: "mma" }, NOW).soonCount).toBe(3);
  });
});

describe("filterEvents", () => {
  it("narrows by sport, then by league", () => {
    expect(filterEvents(EVENTS, { sport: "voetbal", league: null, soon: false }, NOW)).toHaveLength(
      4
    );
    expect(
      filterEvents(EVENTS, { sport: "voetbal", league: "soccer_epl", soon: false }, NOW)
    ).toHaveLength(2);
  });

  it("combines a league with the time filter", () => {
    expect(
      filterEvents(EVENTS, { sport: "voetbal", league: "soccer_epl", soon: true }, NOW)
    ).toHaveLength(1);
  });
});

describe("filterHref", () => {
  it("drops every default so the plain URL stays clean", () => {
    expect(filterHref({})).toBe("/app/sportsbook");
    expect(filterHref({ sport: "alles" })).toBe("/app/sportsbook");
  });

  it("writes the league instead of the sport, since the league implies it", () => {
    expect(filterHref({ sport: "voetbal", league: "soccer_epl" })).toBe(
      "/app/sportsbook?l=soccer_epl"
    );
    expect(filterHref({ sport: "voetbal", soon: true })).toBe("/app/sportsbook?s=voetbal&soon=1");
  });
});
