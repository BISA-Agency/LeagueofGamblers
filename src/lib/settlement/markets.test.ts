import { describe, expect, test } from "vitest";
import {
  settleBtts,
  settleDoubleChance,
  settleDrawNoBet,
  settleH2h,
  settleSpread,
  settleTeamTotal,
  settleTotals,
} from "./markets";

/**
 * These decide balances on every settled fixture, and they had no tests. The
 * cases below are the ones where a plausible-looking implementation quietly
 * pays the wrong side: Asian quarter-lines, the direction of a handicap, and
 * the wording a provider uses for a double chance.
 */

const HOME = "Ajax";
const AWAY = "Feyenoord";

describe("settleH2h", () => {
  test("pays the home side when it wins", () => {
    expect(settleH2h(HOME, HOME, AWAY, 2, 1)).toBe("won");
  });

  test("pays the draw when the scores are level", () => {
    expect(settleH2h("Draw", HOME, AWAY, 1, 1)).toBe("won");
  });

  test("loses a team selection on a draw", () => {
    expect(settleH2h(HOME, HOME, AWAY, 1, 1)).toBe("lost");
  });

  test("pays the away side when it wins", () => {
    expect(settleH2h(AWAY, HOME, AWAY, 0, 3)).toBe("won");
  });
});

describe("settleTotals", () => {
  test("pays over when the goals clear the line", () => {
    expect(settleTotals("Over", 2.5, 3)).toBe("won");
  });

  test("pays under when they do not", () => {
    expect(settleTotals("Under", 2.5, 2)).toBe("won");
  });

  test("returns the stake when the total lands exactly on a whole line", () => {
    expect(settleTotals("Over", 3, 3)).toBe("void");
    expect(settleTotals("Under", 3, 3)).toBe("void");
  });

  /**
   * An Asian 2.75 is half a stake on 2.5 and half on 3.0. Three goals wins the
   * first half and pushes the second, so the bet is half won — settling it as
   * a whole line would overpay the over and underpay the under.
   */
  test("half-wins an over on a quarter line that lands on the upper half", () => {
    expect(settleTotals("Over", 2.75, 3)).toBe("half_won");
  });

  test("half-loses the under on that same quarter line", () => {
    expect(settleTotals("Under", 2.75, 3)).toBe("half_lost");
  });

  test("wins a quarter line outright when the goals clear both halves", () => {
    expect(settleTotals("Over", 2.75, 4)).toBe("won");
  });

  test("loses a quarter line outright when the goals clear neither", () => {
    expect(settleTotals("Over", 2.75, 2)).toBe("lost");
  });

  test("voids a label that is neither over nor under", () => {
    expect(settleTotals("Yes", 2.5, 3)).toBe("void");
  });
});

describe("settleSpread", () => {
  test("wins a home handicap the home side covers", () => {
    expect(settleSpread(HOME, -1.5, HOME, AWAY, 2, 0)).toBe("won");
  });

  test("loses a home handicap the home side fails to cover", () => {
    expect(settleSpread(HOME, -1.5, HOME, AWAY, 1, 0)).toBe("lost");
  });

  /** The line is quoted from the home side, so the away bet gets it mirrored. */
  test("wins the away side of that same handicap", () => {
    expect(settleSpread(AWAY, -1.5, HOME, AWAY, 1, 0)).toBe("won");
  });

  test("returns the stake when a whole-number handicap lands level", () => {
    expect(settleSpread(HOME, -1, HOME, AWAY, 1, 0)).toBe("void");
  });

  test("half-wins a quarter handicap that clears one of its two halves", () => {
    // -0.25 splits over 0 and -0.5: a one-goal win takes both, a draw takes
    // the push on 0 and loses the -0.5.
    expect(settleSpread(HOME, -0.25, HOME, AWAY, 1, 1)).toBe("half_lost");
  });

  test("voids a label naming neither side", () => {
    expect(settleSpread("Draw", -1, HOME, AWAY, 2, 0)).toBe("void");
  });
});

describe("settleTeamTotal", () => {
  test("reads the line against that team's own goals", () => {
    expect(settleTeamTotal("Over", 1.5, 2)).toBe("won");
    expect(settleTeamTotal("Over", 1.5, 1)).toBe("lost");
  });
});

describe("settleBtts", () => {
  test("pays yes when both sides score", () => {
    expect(settleBtts("Yes", 1, 2)).toBe("won");
  });

  test("pays no when one side blanks", () => {
    expect(settleBtts("No", 3, 0)).toBe("won");
    expect(settleBtts("Yes", 3, 0)).toBe("lost");
  });

  test("pays no on a goalless draw", () => {
    expect(settleBtts("No", 0, 0)).toBe("won");
  });
});

describe("settleDoubleChance", () => {
  /**
   * Verified against a live response: the provider writes these as "Chelsea or
   * Draw", not slash-separated. Guessing the slash once voided every one of
   * these bets.
   */
  test("pays a home-or-draw ticket on a draw", () => {
    expect(settleDoubleChance(`${HOME} or Draw`, HOME, AWAY, 1, 1)).toBe("won");
  });

  test("pays a home-or-draw ticket on a home win", () => {
    expect(settleDoubleChance(`${HOME} or Draw`, HOME, AWAY, 2, 1)).toBe("won");
  });

  test("loses a home-or-draw ticket on an away win", () => {
    expect(settleDoubleChance(`${HOME} or Draw`, HOME, AWAY, 0, 1)).toBe("lost");
  });

  test("pays a both-teams ticket whichever side wins", () => {
    expect(settleDoubleChance(`${HOME} or ${AWAY}`, HOME, AWAY, 0, 1)).toBe("won");
  });

  test("loses a both-teams ticket on a draw", () => {
    expect(settleDoubleChance(`${HOME} or ${AWAY}`, HOME, AWAY, 1, 1)).toBe("lost");
  });

  test("still reads a slash-separated label from another provider", () => {
    expect(settleDoubleChance(`${HOME}/Draw`, HOME, AWAY, 1, 1)).toBe("won");
  });

  /** An unrecognised name must not quietly read as "not covered" and lose. */
  test("voids a label naming a team that is not playing", () => {
    expect(settleDoubleChance("Arsenal or Draw", HOME, AWAY, 1, 1)).toBe("void");
  });
});

describe("settleDrawNoBet", () => {
  test("pays the winner", () => {
    expect(settleDrawNoBet(HOME, HOME, AWAY, 2, 0)).toBe("won");
    expect(settleDrawNoBet(AWAY, HOME, AWAY, 2, 0)).toBe("lost");
  });

  test("returns the stake on a draw", () => {
    expect(settleDrawNoBet(HOME, HOME, AWAY, 1, 1)).toBe("void");
  });
});
