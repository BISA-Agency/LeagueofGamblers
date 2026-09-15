import { describe, expect, test } from "vitest";
import {
  affordableReward,
  calculatePrizeSplit,
  effectiveBuyIn,
  potAfterMissions,
  resolvePrizeTiers,
  type PrizeTierRow,
} from "./payouts";

const defaultTiers: PrizeTierRow[] = [{ minPlayers: 1, maxPlayers: 6, split: [{ rank: 1, percent: 100 }] }];

describe("resolvePrizeTiers", () => {
  test("standard mode passes through prizeSplitOverride when set", () => {
    const override: PrizeTierRow[] = [
      {
        minPlayers: 0,
        maxPlayers: null,
        split: [
          { rank: 1, percent: 60 },
          { rank: 2, percent: 40 },
        ],
      },
    ];
    expect(resolvePrizeTiers({ prizeMode: "standard", prizeSplitOverride: override }, defaultTiers)).toEqual(
      override
    );
  });

  test("standard mode falls back to the default tiers with no override", () => {
    expect(resolvePrizeTiers({ prizeMode: "standard", prizeSplitOverride: null }, defaultTiers)).toEqual(
      defaultTiers
    );
  });

  test("hardcore mode always pays 100% to rank 1, ignoring any override", () => {
    const override: PrizeTierRow[] = [
      {
        minPlayers: 0,
        maxPlayers: null,
        split: [
          { rank: 1, percent: 50 },
          { rank: 2, percent: 50 },
        ],
      },
    ];
    expect(resolvePrizeTiers({ prizeMode: "hardcore", prizeSplitOverride: override }, defaultTiers)).toEqual([
      { minPlayers: 1, maxPlayers: null, split: [{ rank: 1, percent: 100 }] },
    ]);
  });

  test("hardcore payout via calculatePrizeSplit gives everything to rank 1 at any field size", () => {
    const tiers = resolvePrizeTiers({ prizeMode: "hardcore", prizeSplitOverride: null }, defaultTiers);
    expect(calculatePrizeSplit(23, 2300, tiers)).toEqual([{ rank: 1, amount: 2300 }]);
  });
});

describe("effectiveBuyIn", () => {
  test("passes through unchanged when bounty is disabled", () => {
    expect(effectiveBuyIn({ buyInAmount: 100, bountyEnabled: false, bountyPerPlayer: 20 })).toBe(100);
  });

  test("subtracts the bounty portion when enabled", () => {
    expect(effectiveBuyIn({ buyInAmount: 100, bountyEnabled: true, bountyPerPlayer: 20 })).toBe(80);
  });
});

describe("potAfterMissions", () => {
  test("takes the mission budget out of the pot when the challenge says so", () => {
    expect(potAfterMissions(800, { missionBudget: 50, missionsFromPot: true })).toBe(750);
  });

  test("leaves the pot alone when the organiser funds missions", () => {
    expect(potAfterMissions(800, { missionBudget: 50, missionsFromPot: false })).toBe(800);
  });

  test("never goes below zero when the budget exceeds a small pot", () => {
    expect(potAfterMissions(30, { missionBudget: 50, missionsFromPot: true })).toBe(0);
  });
});

describe("affordableReward", () => {
  test("pays the full reward while the budget has room", () => {
    expect(affordableReward(5, 50, 15)).toBe(5);
  });

  test("pays only what is left when the reward would overshoot", () => {
    expect(affordableReward(5, 50, 47)).toBe(3);
  });

  test("pays nothing once the budget is spent", () => {
    expect(affordableReward(5, 50, 50)).toBe(0);
    expect(affordableReward(5, 50, 55)).toBe(0);
  });

  test("keeps cents exact", () => {
    expect(affordableReward(2.5, 10, 8.3)).toBe(1.7);
  });
});
