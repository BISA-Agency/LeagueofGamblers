import type { Challenge } from "@drizzle/schema";

/**
 * The lobby's filter state lives in the URL, so every tab and chip is a plain
 * link and the server component does the filtering — no client state, and a
 * filtered view can be shared as-is.
 *
 *   /app/challenges?status=live&type=week,month&feat=bounty,rebuy
 */

export const LOBBY_STATUSES = ["open", "live", "finished"] as const;
export type LobbyStatus = (typeof LOBBY_STATUSES)[number];

export const LOBBY_TYPES = ["week", "month", "season"] as const;
export type LobbyType = (typeof LOBBY_TYPES)[number];

export const LOBBY_FEATURES = ["hardcore", "rebuy", "bounty"] as const;
export type LobbyFeature = (typeof LOBBY_FEATURES)[number];

export type LobbyFacets = {
  types: readonly LobbyType[];
  features: readonly LobbyFeature[];
};

export type LobbyFilters = LobbyFacets & { status: LobbyStatus | null };

function pickKnown<T extends string>(raw: string | undefined, allowed: readonly T[]): T[] {
  if (!raw) return [];
  return raw.split(",").filter((v): v is T => (allowed as readonly string[]).includes(v));
}

export function parseLobbyFilters(params: { status?: string; type?: string; feat?: string }): LobbyFilters {
  const status = (LOBBY_STATUSES as readonly string[]).includes(params.status ?? "")
    ? (params.status as LobbyStatus)
    : null;
  return {
    status,
    types: pickKnown(params.type, LOBBY_TYPES),
    features: pickKnown(params.feat, LOBBY_FEATURES),
  };
}

/** Which tab a challenge belongs on. Settling rides with live; drafts are never listed. */
export function lobbyStatusOf(status: Challenge["status"]): LobbyStatus | null {
  switch (status) {
    case "open":
      return "open";
    case "live":
    case "settling":
      return "live";
    case "finished":
      return "finished";
    default:
      return null;
  }
}

/**
 * Types are an OR (a week OR a month challenge); features are an AND (must be
 * a rebuy AND a bounty challenge) — the way poker lobbies treat "game type"
 * versus "table features".
 */
export function matchesLobbyFacets(
  challenge: Pick<Challenge, "durationType" | "prizeMode" | "allowRebuy" | "bountyEnabled">,
  facets: LobbyFacets
): boolean {
  if (facets.types.length > 0 && !(facets.types as readonly string[]).includes(challenge.durationType)) {
    return false;
  }
  for (const feature of facets.features) {
    if (feature === "hardcore" && challenge.prizeMode !== "hardcore") return false;
    if (feature === "rebuy" && !challenge.allowRebuy) return false;
    if (feature === "bounty" && !challenge.bountyEnabled) return false;
  }
  return true;
}

/** The tab to land on when the URL doesn't say: whatever has something to join first. */
export function defaultLobbyStatus(counts: Record<LobbyStatus, number>): LobbyStatus {
  if (counts.open > 0) return "open";
  if (counts.live > 0) return "live";
  if (counts.finished > 0) return "finished";
  return "open";
}

type HrefPatch = {
  status?: LobbyStatus;
  toggleType?: LobbyType;
  toggleFeature?: LobbyFeature;
  clearFacets?: boolean;
};

function toggled<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function lobbyHref(current: LobbyFilters, patch: HrefPatch = {}): string {
  const status = patch.status ?? current.status;
  const types = patch.clearFacets
    ? []
    : patch.toggleType
      ? toggled(current.types, patch.toggleType)
      : [...current.types];
  const features = patch.clearFacets
    ? []
    : patch.toggleFeature
      ? toggled(current.features, patch.toggleFeature)
      : [...current.features];

  const parts: string[] = [];
  if (status) parts.push(`status=${status}`);
  if (types.length > 0) parts.push(`type=${types.join(",")}`);
  if (features.length > 0) parts.push(`feat=${features.join(",")}`);
  return parts.length > 0 ? `/app/challenges?${parts.join("&")}` : "/app/challenges";
}
