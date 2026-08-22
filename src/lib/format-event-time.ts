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
