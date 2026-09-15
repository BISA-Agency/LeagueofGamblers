import { describe, expect, test } from "vitest";
import { pickRandomMatches } from "./pick-matches";

describe("pickRandomMatches", () => {
  test("returns exactly `count` items from a bigger pool", () => {
    const pool = [1, 2, 3, 4, 5, 6, 7, 8];
    const picked = pickRandomMatches(pool, 5);
    expect(picked).toHaveLength(5);
    expect(new Set(picked).size).toBe(5); // no duplicates
    for (const item of picked) expect(pool).toContain(item);
  });

  test("returns every item, in some order, when the pool is smaller than count", () => {
    const pool = ["a", "b", "c"];
    const picked = pickRandomMatches(pool, 5);
    expect(picked.sort()).toEqual(["a", "b", "c"]);
  });

  test("with a fixed random source, always picks the same items deterministically", () => {
    const pool = [1, 2, 3, 4, 5];
    // Fisher-Yates with random() always 0 always swaps index i with index 0 —
    // traced by hand: [1,2,3,4,5] -> [5,2,3,4,1] -> [4,2,3,5,1] -> [3,2,4,5,1]
    // -> [2,3,4,5,1], then sliced to 3.
    const alwaysZero = () => 0;
    expect(pickRandomMatches(pool, 3, alwaysZero)).toEqual([2, 3, 4]);
  });
});
