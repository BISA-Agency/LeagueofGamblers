import { describe, expect, test } from "vitest";
import {
  defaultLobbyStatus,
  lobbyHref,
  lobbyStatusOf,
  matchesLobbyFacets,
  parseLobbyFilters,
} from "./lobby-filters";

const standard = {
  durationType: "custom" as const,
  prizeMode: "standard" as const,
  allowRebuy: false,
  bountyEnabled: false,
};

describe("parseLobbyFilters", () => {
  test("empty params mean no status and no facets", () => {
    expect(parseLobbyFilters({})).toEqual({
      status: null,
      types: [],
      features: [],
    });
  });

  test("reads status, comma-separated types and features", () => {
    expect(parseLobbyFilters({ status: "live", type: "week,month", feat: "bounty" })).toEqual({
      status: "live",
      types: ["week", "month"],
      features: ["bounty"],
    });
  });

  test("drops unknown values instead of throwing", () => {
    expect(parseLobbyFilters({ status: "draft", type: "year,week", feat: "x" })).toEqual({
      status: null,
      types: ["week"],
      features: [],
    });
  });
});

describe("lobbyStatusOf", () => {
  test("maps settling onto the live tab and hides drafts", () => {
    expect(lobbyStatusOf("open")).toBe("open");
    expect(lobbyStatusOf("live")).toBe("live");
    expect(lobbyStatusOf("settling")).toBe("live");
    expect(lobbyStatusOf("finished")).toBe("finished");
    expect(lobbyStatusOf("draft")).toBeNull();
  });
});

describe("matchesLobbyFacets", () => {
  test("no facets selected matches everything", () => {
    expect(matchesLobbyFacets(standard, { types: [], features: [] })).toBe(true);
  });

  test("type facets are an OR within the group", () => {
    const facets = { types: ["week", "month"] as const, features: [] };
    expect(matchesLobbyFacets({ ...standard, durationType: "month" }, facets)).toBe(true);
    expect(matchesLobbyFacets({ ...standard, durationType: "season" }, facets)).toBe(false);
    expect(matchesLobbyFacets(standard, facets)).toBe(false);
  });

  test("feature facets must all be present", () => {
    const facets = { types: [], features: ["rebuy", "bounty"] as const };
    expect(matchesLobbyFacets({ ...standard, allowRebuy: true, bountyEnabled: true }, facets)).toBe(true);
    expect(matchesLobbyFacets({ ...standard, allowRebuy: true }, facets)).toBe(false);
  });

  test("hardcore facet reads prizeMode", () => {
    const facets = { types: [], features: ["hardcore"] as const };
    expect(matchesLobbyFacets({ ...standard, prizeMode: "hardcore" }, facets)).toBe(true);
    expect(matchesLobbyFacets(standard, facets)).toBe(false);
  });
});

describe("defaultLobbyStatus", () => {
  test("prefers open, then live, then finished", () => {
    expect(defaultLobbyStatus({ open: 1, live: 3, finished: 2 })).toBe("open");
    expect(defaultLobbyStatus({ open: 0, live: 1, finished: 2 })).toBe("live");
    expect(defaultLobbyStatus({ open: 0, live: 0, finished: 2 })).toBe("finished");
    expect(defaultLobbyStatus({ open: 0, live: 0, finished: 0 })).toBe("open");
  });
});

describe("lobbyHref", () => {
  const base = {
    status: "live" as const,
    types: ["week" as const],
    features: ["bounty" as const],
  };

  test("serialises the current filters", () => {
    expect(lobbyHref(base)).toBe("/app/challenges?status=live&type=week&feat=bounty");
  });

  test("omits empty groups and yields the bare path when nothing is set", () => {
    expect(lobbyHref({ status: null, types: [], features: [] })).toBe("/app/challenges");
  });

  test("toggling a facet adds it when absent and removes it when present", () => {
    expect(lobbyHref(base, { toggleType: "month" })).toBe(
      "/app/challenges?status=live&type=week,month&feat=bounty"
    );
    expect(lobbyHref(base, { toggleFeature: "bounty" })).toBe("/app/challenges?status=live&type=week");
  });

  test("switching status keeps the facets", () => {
    expect(lobbyHref(base, { status: "open" })).toBe("/app/challenges?status=open&type=week&feat=bounty");
  });

  test("clearing facets keeps the status", () => {
    expect(lobbyHref(base, { clearFacets: true })).toBe("/app/challenges?status=live");
  });
});
