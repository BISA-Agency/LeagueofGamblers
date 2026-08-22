const AMSTERDAM_TZ = "Europe/Amsterdam";

// Interprets a `datetime-local` input value (e.g. "2026-09-01T10:00") as
// Europe/Amsterdam wall-clock time and returns the equivalent UTC Date.
// Needed because challenge start/end dates are entered and shown in
// Europe/Amsterdam (§7) but stored in UTC.
export function amsterdamLocalToUtc(value: string): Date {
  const [datePart, timePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = (timePart ?? "00:00").split(":").map(Number);

  const naiveUtcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const offsetMinutes = getAmsterdamOffsetMinutes(naiveUtcGuess);
  return new Date(naiveUtcGuess.getTime() - offsetMinutes * 60_000);
}

function getAmsterdamOffsetMinutes(date: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: AMSTERDAM_TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return (asUtc - date.getTime()) / 60_000;
}
