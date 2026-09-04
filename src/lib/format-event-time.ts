const TZ = "Europe/Amsterdam";
const timeFormatter = new Intl.DateTimeFormat("nl-NL", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
const weekdayFormatter = new Intl.DateTimeFormat("nl-NL", { weekday: "short", day: "numeric", month: "short", timeZone: TZ });
const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }); // yyyy-mm-dd, stable for comparison

/** "Vandaag, 20:00" / "Morgen, 13:00" / "za 22 aug, 19:45" — Europe/Amsterdam-aware. */
export function formatEventTime(date: Date, now = new Date()): string {
  const time = timeFormatter.format(date);
  const dayDiff = dayKeyDiff(date, now);

  if (dayDiff === 0) return `Vandaag, ${time}`;
  if (dayDiff === 1) return `Morgen, ${time}`;
  return `${weekdayFormatter.format(date)}, ${time}`;
}

function dayKeyDiff(date: Date, now: Date): number {
  const a = dayKeyFormatter.format(date);
  const b = dayKeyFormatter.format(now);
  const diffMs = Date.parse(a) - Date.parse(b);
  return Math.round(diffMs / 86_400_000);
}

/** Kick-off close enough that a card marks it in the brand colour. */
const IMMINENT_MS = 2 * 3_600_000;

/**
 * Same labels, split so a card can stack the day over the time — plus whether
 * the match is nearly on, which belongs here rather than in the component:
 * reading the clock during render is exactly what the purity rule forbids.
 */
export function formatEventDayTime(
  date: Date,
  now = new Date()
): { day: string; time: string; imminent: boolean } {
  const time = timeFormatter.format(date);
  const dayDiff = dayKeyDiff(date, now);
  const imminent = date.getTime() - now.getTime() <= IMMINENT_MS;

  if (dayDiff === 0) return { day: "Vandaag", time, imminent };
  if (dayDiff === 1) return { day: "Morgen", time, imminent };
  return { day: weekdayFormatter.format(date), time, imminent };
}
