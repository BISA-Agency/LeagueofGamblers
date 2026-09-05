import { describe, expect, it } from "vitest";
import { decideBet } from "./decide-bet";
import type { SettlementOutcome } from "./markets";

const legs = (...results: (SettlementOutcome | null)[]) => results.map((result) => ({ result }));

describe("decideBet", () => {
  it("waits while nothing has been decided", () => {
    expect(decideBet(legs(null, null, null))).toBe("pending");
  });

  // The change this file exists for: a combi with a losing leg cannot come
  // back, so it does not sit on "still running" until Sunday.
  it("loses as soon as one leg loses, whatever the rest is doing", () => {
    expect(decideBet(legs("lost", null, null))).toBe("lost");
    expect(decideBet(legs("won", "lost", null))).toBe("lost");
    expect(decideBet(legs(null, null, "half_lost"))).toBe("lost");
  });

  it("still waits for every leg before paying out", () => {
    expect(decideBet(legs("won", "won", null))).toBe("pending");
    expect(decideBet(legs("won", "won", "won"))).toBe("won");
  });

  // A void leg drops out of the sum, so a win around it is still a win.
  it("wins around a voided leg", () => {
    expect(decideBet(legs("won", "void", "half_won"))).toBe("won");
  });

  it("refunds only when every leg is void", () => {
    expect(decideBet(legs("void", "void"))).toBe("void");
    expect(decideBet(legs("void", null))).toBe("pending");
  });

  // A voided leg beside a losing one changes nothing: the loss stands.
  it("keeps a loss even when another leg voids", () => {
    expect(decideBet(legs("lost", "void"))).toBe("lost");
  });

  it("has nothing to say about a bet with no legs", () => {
    expect(decideBet([])).toBe("pending");
  });
});
