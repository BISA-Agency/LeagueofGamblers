import { describe, expect, test } from "vitest";
import { pickPrimaryMarket } from "./primary-market";

const m = (type: string) => ({ type }) as { type: string };

describe("pickPrimaryMarket", () => {
  test("leads with the match result", () => {
    expect(pickPrimaryMarket([m("totals"), m("h2h"), m("spreads")])?.type).toBe("h2h");
  });

  /**
   * The regression this exists to prevent: ranking with indexOf gave every
   * unlisted market -1, which sorts ahead of h2h at 0. Once every fixture
   * carried both-teams-to-score, half the cards led with "Yes / No".
   */
  test("still leads with the match result when newer markets are present", () => {
    const markets = [m("btts"), m("double_chance"), m("correct_score"), m("h2h")];
    expect(pickPrimaryMarket(markets)?.type).toBe("h2h");
  });

  test("keeps an unknown market type off the front of the card", () => {
    expect(pickPrimaryMarket([m("something_new"), m("h2h")])?.type).toBe("h2h");
  });

  test("falls back to over/under when there is no match result", () => {
    expect(pickPrimaryMarket([m("btts"), m("totals")])?.type).toBe("totals");
  });

  test("shows an unknown market rather than nothing at all", () => {
    expect(pickPrimaryMarket([m("something_new")])?.type).toBe("something_new");
  });

  test("has nothing to show for an event with no markets", () => {
    expect(pickPrimaryMarket([])).toBeUndefined();
  });
});
