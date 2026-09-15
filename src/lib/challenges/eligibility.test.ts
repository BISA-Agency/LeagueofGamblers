import { describe, expect, test } from "vitest";
import { canJoinChallenge } from "./eligibility";

const base = {
  status: "open" as const,
  startAt: new Date("2026-09-01T00:00:00Z"),
  lateJoinDays: 0,
};

describe("canJoinChallenge", () => {
  test("open challenge is always joinable", () => {
    expect(canJoinChallenge(base)).toBe(true);
  });

  test("live challenge with no late-join window rejects", () => {
    expect(canJoinChallenge({ ...base, status: "live" })).toBe(false);
  });

  test("live challenge within its late-join window accepts", () => {
    const twoDaysIn = new Date("2026-09-03T00:00:00Z");
    expect(canJoinChallenge({ ...base, status: "live", lateJoinDays: 7 }, twoDaysIn)).toBe(true);
  });

  test("live challenge past its late-join window rejects", () => {
    const nineDaysIn = new Date("2026-09-10T00:00:01Z");
    expect(canJoinChallenge({ ...base, status: "live", lateJoinDays: 7 }, nineDaysIn)).toBe(false);
  });

  test("exactly on the deadline still accepts", () => {
    const exactlySevenDaysIn = new Date("2026-09-08T00:00:00Z");
    expect(canJoinChallenge({ ...base, status: "live", lateJoinDays: 7 }, exactlySevenDaysIn)).toBe(
      true
    );
  });

  test("settling or finished never joinable, even with a window", () => {
    expect(canJoinChallenge({ ...base, status: "settling", lateJoinDays: 7 })).toBe(false);
    expect(canJoinChallenge({ ...base, status: "finished", lateJoinDays: 7 })).toBe(false);
  });
});
