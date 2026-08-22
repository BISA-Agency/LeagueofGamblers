// Country picker for profiles. Stored as ISO 3166-1 alpha-2; the Dutch name
// comes from Intl.DisplayNames and the flag from public/flags/<code>.svg (see
// scripts/copy-flags.ts) — so this file only needs to know *which* countries
// to offer, not what they're called or what they look like.

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

export function countryName(code: string): string {
  try {
    return displayNames.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

export type CountryOption = { code: string; name: string };

export const COUNTRY_OPTIONS: CountryOption[] = COUNTRY_CODES.map((code) => ({
  code,
  name: countryName(code),
})).sort((a, b) => a.name.localeCompare(b.name, "nl"));

export function isKnownCountry(code: string): boolean {
  return (COUNTRY_CODES as readonly string[]).includes(code.toUpperCase());
}
