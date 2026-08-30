import { describe, expect, test } from "vitest";
import { settleableMarkets } from "./settleable-markets";
import type { MarketType } from "./types";

const ALL: MarketType[] = [
  "h2h",
  "totals",
  "spreads",
  "team_totals",
  "btts",
  "double_chance",
  "draw_no_bet",
  "correct_score",
];

describe("settleableMarkets", () => {
  test("gives football everything, because a final score decides all of it", () => {
    expect(settleableMarkets("soccer_epl", ALL)).toEqual(ALL);
  });

  test("keeps the match winner for tennis", () => {
    expect(settleableMarkets("tennis_atp_us_open", ALL)).toContain("h2h");
  });

  /**
   * Tennis quotes its total in games (39.5) and its handicap in sets (-1.5),
   * while the scores endpoint returns one number per player. Whichever unit
   * that number is, it cannot settle both — so neither market is imported.
   */
  test("drops the tennis total, quoted in games", () => {
    expect(settleableMarkets("tennis_wta_us_open", ALL)).not.toContain("totals");
  });

  test("drops the tennis handicap, quoted in sets", () => {
    expect(settleableMarkets("tennis_atp_us_open", ALL)).not.toContain("spreads");
  });

  test("drops football-only markets from a fight card", () => {
    const kept = settleableMarkets("mma_mixed_martial_arts", ALL);
    expect(kept).toEqual(["h2h"]);
  });

  test("treats boxing like any other fight card", () => {
    expect(settleableMarkets("boxing_boxing", ALL)).toEqual(["h2h"]);
  });

  test("lets basketball keep its points markets", () => {
    const kept = settleableMarkets("basketball_euroleague", ALL);
    expect(kept).toEqual(["h2h", "totals", "spreads"]);
  });

  test("never returns a market the challenge did not ask for", () => {
    expect(settleableMarkets("soccer_epl", ["h2h"])).toEqual(["h2h"]);
  });

  test("falls back to the match winner for a sport it has no rule for", () => {
    expect(settleableMarkets("cricket_the_hundred", ALL)).toEqual(["h2h"]);
  });
});
