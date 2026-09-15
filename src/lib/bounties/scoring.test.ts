import { describe, expect, test } from "vitest";
import { resolveBountyWinners, scoreBountyPrediction } from "./scoring";

describe("scoreBountyPrediction", () => {
  const result = { homeScore: 2, awayScore: 1 };

  test("exact score is worth 3 points", () => {
    expect(scoreBountyPrediction({ homeGoals: 2, awayGoals: 1 }, result)).toBe(3);
  });

  test("correct winner with the wrong score is worth 1 point", () => {
    expect(scoreBountyPrediction({ homeGoals: 3, awayGoals: 0 }, result)).toBe(1);
  });

  test("correctly predicted draw is worth 1 point even if the scoreline differs", () => {
    expect(scoreBountyPrediction({ homeGoals: 1, awayGoals: 1 }, { homeScore: 2, awayScore: 2 })).toBe(1);
  });

  test("wrong winner is worth 0", () => {
    expect(scoreBountyPrediction({ homeGoals: 0, awayGoals: 1 }, result)).toBe(0);
  });

  test("predicting a draw when the match wasn't a draw is worth 0", () => {
    expect(scoreBountyPrediction({ homeGoals: 1, awayGoals: 1 }, result)).toBe(0);
  });
});

describe("resolveBountyWinners", () => {
  test("no predictions means no winners", () => {
    expect(resolveBountyWinners([])).toEqual([]);
  });

  test("all-zero totals mean no winners — a round nobody predicted correctly stays unclaimed", () => {
    expect(
      resolveBountyWinners([
        { userId: "a", points: 0 },
        { userId: "b", points: 0 },
      ])
    ).toEqual([]);
  });

  test("a single highest score wins alone", () => {
    expect(
      resolveBountyWinners([
        { userId: "a", points: 7 },
        { userId: "b", points: 4 },
      ])
    ).toEqual(["a"]);
  });

  test("a tie at the top splits between everyone tied", () => {
    expect(
      resolveBountyWinners([
        { userId: "a", points: 5 },
        { userId: "b", points: 5 },
        { userId: "c", points: 3 },
      ])
    ).toEqual(["a", "b"]);
  });
});
