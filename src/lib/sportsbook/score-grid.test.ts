import { describe, expect, test } from "vitest";
import { buildScoreGrid } from "./score-grid";

/** A bookmaker's spread: home 0-2, away 0-3, but not every pairing. */
const LABELS = ["0-0", "1-0", "0-1", "1-1", "2-1", "0-2", "1-3"];

describe("buildScoreGrid", () => {
  test("offers every home tally that appears in a score", () => {
    expect(buildScoreGrid(LABELS, null, null).home).toEqual([0, 1, 2]);
  });

  test("offers every away tally that appears in a score", () => {
    expect(buildScoreGrid(LABELS, null, null).away).toEqual([0, 1, 2, 3]);
  });

  test("counts from zero even when the bookmaker skips a tally", () => {
    // 3 is missing from the away side of these, but the row still shows it as
    // a gap rather than closing up and misaligning the two rows.
    const grid = buildScoreGrid(["0-0", "0-2"], null, null);
    expect(grid.away).toEqual([0, 1, 2]);
  });

  test("marks a tally the bookmaker never priced as unavailable", () => {
    const grid = buildScoreGrid(["0-0", "0-2"], null, null);
    expect(grid.awayAvailable(1)).toBe(false);
  });

  /**
   * The point of the picker: once one side is chosen, the other side may only
   * offer the tallies that complete a score the bookmaker actually quoted.
   */
  test("narrows the away side to scores that exist for the chosen home tally", () => {
    const grid = buildScoreGrid(LABELS, 2, null);
    expect(grid.awayAvailable(1)).toBe(true);
    expect(grid.awayAvailable(0)).toBe(false);
  });

  test("narrows the home side to scores that exist for the chosen away tally", () => {
    const grid = buildScoreGrid(LABELS, null, 3);
    expect(grid.homeAvailable(1)).toBe(true);
    expect(grid.homeAvailable(0)).toBe(false);
  });

  test("keeps the chosen tally itself selectable", () => {
    const grid = buildScoreGrid(LABELS, 2, 1);
    expect(grid.homeAvailable(2)).toBe(true);
    expect(grid.awayAvailable(1)).toBe(true);
  });

  test("names the score once both sides are chosen", () => {
    expect(buildScoreGrid(LABELS, 2, 1).label).toBe("2-1");
  });

  test("has no score to name until both sides are chosen", () => {
    expect(buildScoreGrid(LABELS, 2, null).label).toBeNull();
  });

  test("ignores a label that is not a score", () => {
    expect(buildScoreGrid(["0-0", "Any Other"], null, null).home).toEqual([0]);
  });
});
