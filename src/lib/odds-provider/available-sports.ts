import { getOddsApiProvider } from "./index";
import { DEFAULT_SPORT_KEYS, DEFAULT_SPORT_LABELS, SPORT_GROUP_ORDER } from "./sports";
import type { ProviderSport } from "./types";

export type SportGroup = { group: string; sports: ProviderSport[] };

/**
 * What the admin can pick from. Comes from the provider's own catalogue
 * (a free call) rather than a hardcoded list, because keys genuinely change:
 * tennis is scoped per tournament and rotates all year, and competitions go
 * in and out of season.
 *
 * Falls back to the static list when there's no API key or the call fails —
 * the settings page must stay usable either way.
 */
export async function getAvailableSports(
  selectedKeys: string[] = []
): Promise<{ groups: SportGroup[]; live: boolean }> {
  let sports: ProviderSport[];
  let live = true;

  try {
    sports = await getOddsApiProvider().listSports();
  } catch {
    live = false;
    sports = Object.entries(DEFAULT_SPORT_KEYS).map(([ourKey, apiKey]) => ({
      key: apiKey,
      title: DEFAULT_SPORT_LABELS[ourKey],
      group: "Soccer",
      active: true,
    }));
  }

  // A key the challenge already uses must stay visible even if the provider
  // dropped it, otherwise saving the form would silently deselect it.
  const known = new Set(sports.map((s) => s.key));
  for (const key of selectedKeys) {
    if (!known.has(key)) {
      sports.push({ key, title: key, group: "Overig", active: false });
    }
  }

  const byGroup = new Map<string, ProviderSport[]>();
  for (const sport of sports) {
    const list = byGroup.get(sport.group) ?? [];
    list.push(sport);
    byGroup.set(sport.group, list);
  }

  const groups = [...byGroup.entries()]
    .map(([group, list]) => ({
      group,
      sports: list.sort((a, b) => {
        // In-season first, then alphabetically — the admin is usually looking
        // for something they can actually import this week.
        if (a.active !== b.active) return a.active ? -1 : 1;
        return a.title.localeCompare(b.title, "nl");
      }),
    }))
    .sort((a, b) => {
      const ai = SPORT_GROUP_ORDER.indexOf(a.group);
      const bi = SPORT_GROUP_ORDER.indexOf(b.group);
      if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      return a.group.localeCompare(b.group);
    });

  return { groups, live };
}
