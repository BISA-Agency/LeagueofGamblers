import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Gebruikersnaam moet minimaal 3 tekens zijn.")
  .max(24, "Gebruikersnaam mag maximaal 24 tekens zijn.")
  .regex(/^[a-z0-9_]+$/, "Alleen kleine letters, cijfers en underscore (_) zijn toegestaan.");

export const onboardingSchema = z.object({
  username: usernameSchema,
  favoriteClub: z
    .string()
    .trim()
    .max(60, "Maximaal 60 tekens.")
    .optional()
    .transform((v) => (v ? v : undefined)),
  favoriteSport: z
    .string()
    .trim()
    .max(60, "Maximaal 60 tekens.")
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export const profileEditSchema = z.object({
  bio: z
    .string()
    .trim()
    .max(160, "Bio mag maximaal 160 tekens zijn.")
    .optional()
    .transform((v) => (v ? v : undefined)),
  statusText: z
    .string()
    .trim()
    .max(60, "Status mag maximaal 60 tekens zijn.")
    .optional()
    .transform((v) => (v ? v : undefined)),
  favoriteClub: z
    .string()
    .trim()
    .max(60, "Maximaal 60 tekens.")
    .optional()
    .transform((v) => (v ? v : undefined)),
  favoriteSport: z
    .string()
    .trim()
    .max(60, "Maximaal 60 tekens.")
    .optional()
    .transform((v) => (v ? v : undefined)),
});
