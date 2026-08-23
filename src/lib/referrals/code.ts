/**
 * Invite codes get read aloud and retyped from phone screens, so the alphabet
 * drops everything that looks like something else: no 0/O, no 1/I/L, and no
 * vowels either — that last one keeps the generator from spelling a real word
 * by accident.
 *
 * Deliberately free of Node imports: middleware runs on the Edge runtime and
 * needs normalizeInviteCode. The generator lives in assign.ts, server-side.
 */
export const CODE_ALPHABET = "BCDFGHJKMNPQRSTVWXYZ23456789";
export const CODE_LENGTH = 6;

/** Accepts what a human typed: any case, with stray spaces or dashes. */
export function normalizeInviteCode(input: string): string | null {
  const cleaned = input.trim().toUpperCase().replace(/[\s-]/g, "");
  if (cleaned.length !== CODE_LENGTH) return null;
  if (![...cleaned].every((c) => CODE_ALPHABET.includes(c))) return null;
  return cleaned;
}
