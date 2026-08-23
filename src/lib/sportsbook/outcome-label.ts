/**
 * The Odds API returns English outcome labels ("Draw", "Yes", "Chelsea or
 * Draw"). This is display only — the raw label is what goes into the bet slip
 * and what settlement matches on, so it must never be translated on the way
 * into the database.
 */
const WORDS: Record<string, string> = {
  draw: "Gelijkspel",
  yes: "Ja",
  no: "Nee",
  over: "Over",
  under: "Under",
};

export function dutchOutcomeLabel(raw: string): string {
  const direct = WORDS[raw.trim().toLowerCase()];
  if (direct) return direct;

  // "Chelsea or Draw" -> "Chelsea of Gelijkspel"
  const parts = raw.split(/\s+or\s+/i);
  if (parts.length === 2) {
    return parts.map((p) => WORDS[p.trim().toLowerCase()] ?? p.trim()).join(" of ");
  }
  return raw;
}
