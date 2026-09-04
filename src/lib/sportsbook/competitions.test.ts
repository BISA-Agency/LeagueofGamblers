import { describe, expect, it } from "vitest";
import { competitionMeta, flagPath } from "./competitions";

describe("competitionMeta", () => {
  it("gives a known league a short name and its flag", () => {
    expect(competitionMeta("soccer_spain_la_liga", "La Liga - Spain", "Voetbal")).toEqual({
      name: "LaLiga",
      country: "es",
    });
    expect(competitionMeta("soccer_epl", "EPL", "Voetbal")).toEqual({
      name: "Premier League",
      country: "gb",
    });
  });

  it("leaves supranational competitions without a flag", () => {
    expect(
      competitionMeta("soccer_uefa_champs_league", "UEFA Champions League", "Voetbal")
    ).toEqual({ name: "Champions League", country: null });
  });

  // The admin can switch on a league we have no entry for; it must still get a
  // usable pill rather than the raw provider title.
  it("falls back to the sport key for the country", () => {
    expect(competitionMeta("soccer_spain_copa_del_rey", "Copa del Rey", "Voetbal")).toEqual({
      name: "Copa del Rey",
      country: "es",
    });
  });

  it("trims the country back out of a provider title", () => {
    expect(competitionMeta("soccer_x_cup", "Beker - Netherlands", "Voetbal")).toEqual({
      name: "Beker",
      country: "nl",
    });
    expect(competitionMeta("soccer_x_league", "Dutch Eredivisie", "Voetbal")).toEqual({
      name: "Eredivisie",
      country: "nl",
    });
  });

  it("keeps a hyphenated name that is not a country", () => {
    expect(competitionMeta("soccer_x", "Play-off - Groep A", "Voetbal").name).toBe(
      "Play-off - Groep A"
    );
  });

  it("falls back to the sport label when there is no title at all", () => {
    expect(competitionMeta("manual", null, "Handmatig")).toEqual({
      name: "Handmatig",
      country: null,
    });
  });

  // Only the 51 flags in public/flags/ ship, so a country outside that list
  // must resolve to null rather than a 404 in the rail.
  it("never returns a flag we do not ship", () => {
    expect(competitionMeta("soccer_russia_premier_league", "Russia Premier League", "Voetbal")
      .country).toBeNull();
  });

  it("builds the flag path", () => {
    expect(flagPath("nl")).toBe("/flags/nl.svg");
    expect(flagPath(null)).toBeNull();
  });
});
