import type { Event } from "@drizzle/schema";

export type Category = {
  /** URL-safe value for ?c= */
  key: string;
  label: string;
  /** Only "alles" and "binnenkort" get an icon; the rest use a colour disc. */
  kind: "all" | "soon" | "sport" | "competition";
  count: number;
};

const SOON_HOURS = 24;

function slug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

type Filterable = Pick<Event, "startsAt" | "sportLabel" | "competition">;

function isSoon(event: Filterable, now: Date): boolean {
  const diff = event.startsAt.getTime() - now.getTime();
  return diff >= 0 && diff <= SOON_HOURS * 3_600_000;
}

/**
 * The rail is built from the events actually on offer, so it can never point
 * at an empty page — and it grows by itself when a new sport is imported.
 */
export function buildCategories(events: Filterable[], now = new Date()): Category[] {
  const sports = new Map<string, number>();
  const competitions = new Map<string, number>();
  let soon = 0;

  for (const event of events) {
    if (isSoon(event, now)) soon++;
    sports.set(event.sportLabel, (sports.get(event.sportLabel) ?? 0) + 1);
    if (event.competition) {
      competitions.set(event.competition, (competitions.get(event.competition) ?? 0) + 1);
    }
  }

  const byCountDesc = (a: [string, number], b: [string, number]) => b[1] - a[1];

  return [
    { key: "alles", label: "Alles", kind: "all" as const, count: events.length },
    ...(soon > 0
      ? [{ key: "binnenkort", label: "Binnenkort", kind: "soon" as const, count: soon }]
      : []),
    ...[...sports.entries()].sort(byCountDesc).map(([label, count]) => ({
      key: `s-${slug(label)}`,
      label,
      kind: "sport" as const,
      count,
    })),
    ...[...competitions.entries()].sort(byCountDesc).map(([label, count]) => ({
      key: `c-${slug(label)}`,
      label,
      kind: "competition" as const,
      count,
    })),
  ];
}

/** Applies the ?c= value. An unknown key falls back to showing everything. */
export function filterEvents<T extends Filterable>(
  events: T[],
  key: string | undefined,
  now = new Date()
): T[] {
  if (!key || key === "alles") return events;
  if (key === "binnenkort") return events.filter((e) => isSoon(e, now));
  if (key.startsWith("s-")) return events.filter((e) => `s-${slug(e.sportLabel)}` === key);
  if (key.startsWith("c-")) {
    return events.filter((e) => e.competition && `c-${slug(e.competition)}` === key);
  }
  return events;
}
