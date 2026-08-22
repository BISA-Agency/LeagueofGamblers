// Country picker for profiles. Stored as ISO 3166-1 alpha-2; the flag is
// derived from the code (regional indicator symbols), the Dutch name from
// Intl.DisplayNames — so this file only needs to know *which* countries to
// offer, not what they're called.

// Curated rather than all ~250 ISO codes: the friend group is Dutch/European,
// and a 250-row dropdown makes the common case worse. Extending the list is
// one code here.
const COUNTRY_CODES = [
  // Benelux + neighbours first in spirit; the list is sorted by Dutch name below.
  "NL", "BE", "DE", "FR", "GB", "ES", "PT", "IT", "AT", "CH",
  "DK", "SE", "NO", "FI", "IE", "PL", "CZ", "HU", "RO", "BG",
  "GR", "HR", "RS", "BA", "ME", "MK", "AL", "SI", "SK", "UA",
  "TR", "MA", "DZ", "TN", "EG", "SR", "CW", "AW", "ID", "CV",
  "US", "CA", "BR", "AR", "MX", "JP", "KR", "CN", "IN", "AU",
] as const;

const displayNames = new Intl.DisplayNames(["nl"], { type: "region" });

/** "NL" -> 🇳🇱 (two regional-indicator code points; no image assets needed). */
export function countryFlag(code: string | null | undefined): string | null {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return null;
  const upper = code.toUpperCase();
  return String.fromCodePoint(
    0x1f1e6 + (upper.charCodeAt(0) - 65),
    0x1f1e6 + (upper.charCodeAt(1) - 65)
  );
}

export function countryName(code: string): string {
  try {
    return displayNames.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

export type CountryOption = { code: string; name: string; flag: string };

export const COUNTRY_OPTIONS: CountryOption[] = COUNTRY_CODES.map((code) => ({
  code,
  name: countryName(code),
  flag: countryFlag(code)!,
})).sort((a, b) => a.name.localeCompare(b.name, "nl"));

export function isKnownCountry(code: string): boolean {
  return (COUNTRY_CODES as readonly string[]).includes(code.toUpperCase());
}
