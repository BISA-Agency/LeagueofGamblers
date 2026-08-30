import { describe, expect, test } from "vitest";
import { normalizeCorrectScoreLabel } from "@/lib/odds-provider/correct-score";
import { settleCorrectScore } from "./markets";

/**
 * The provider writes these as "Leeds United:1|Brentford:0". Verified against a
 * live response on 2026-08-30 across eight bookmakers — the same check that
 * double_chance needed after its slash-separated guess settled every bet void.
 */
describe("normalizeCorrectScoreLabel", () => {
  const home = "Leeds United";
  const away = "Brentford";

  test("reads a home win as home-away", () => {
    expect(normalizeCorrectScoreLabel("Leeds United:2|Brentford:1", home, away)).toBe("2-1");
  });

  test("reads a goalless draw", () => {
    expect(normalizeCorrectScoreLabel("Leeds United:0|Brentford:0", home, away)).toBe("0-0");
  });

  test("keeps home first even when the away team is listed first", () => {
    expect(normalizeCorrectScoreLabel("Brentford:3|Leeds United:1", home, away)).toBe("1-3");
  });

  test("tolerates spacing around the separator", () => {
    expect(normalizeCorrectScoreLabel("Leeds United : 2 | Brentford : 0", home, away)).toBe("2-0");
  });

  test("rejects a label naming a team that isn't playing", () => {
    expect(normalizeCorrectScoreLabel("Arsenal:2|Brentford:1", home, away)).toBeNull();
  });

  test("rejects a label that isn't a score at all", () => {
    expect(normalizeCorrectScoreLabel("Any Other Score", home, away)).toBeNull();
  });

  test("rejects a half-written label", () => {
    expect(normalizeCorrectScoreLabel("Leeds United:2", home, away)).toBeNull();
  });

  test("keeps a long shot that could actually happen", () => {
    expect(normalizeCorrectScoreLabel("Leeds United:5|Brentford:1", home, away)).toBe("5-1");
  });

  test("drops a scoreline no football match reaches", () => {
    // Bookmakers pad these out to 10-0 at a flat placeholder price. They are
    // not real quotes, and they crowd out the ones people actually bet.
    expect(normalizeCorrectScoreLabel("Leeds United:10|Brentford:0", home, away)).toBeNull();
  });
});

describe("settleCorrectScore", () => {
  test("wins on the exact score", () => {
    expect(settleCorrectScore("2-1", 2, 1)).toBe("won");
  });

  test("loses when the goals are the right way round but wrong", () => {
    expect(settleCorrectScore("2-1", 3, 1)).toBe("lost");
  });

  test("loses on the mirrored score", () => {
    expect(settleCorrectScore("2-1", 1, 2)).toBe("lost");
  });

  test("wins on a goalless draw", () => {
    expect(settleCorrectScore("0-0", 0, 0)).toBe("won");
  });

  test("voids a label it cannot read, rather than guessing", () => {
    expect(settleCorrectScore("Any Other Score", 2, 1)).toBe("void");
  });
});
