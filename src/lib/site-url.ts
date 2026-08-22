/**
 * The app's own public base URL, without a trailing slash.
 *
 * Order matters:
 * 1. NEXT_PUBLIC_SITE_URL — set this once you have a custom domain.
 * 2. Vercel's own production domain, which it injects automatically. This
 *    removes the chicken-and-egg problem at first deploy: you can't know the
 *    assigned *.vercel.app URL before the project exists, and getting it
 *    wrong silently sends magic links to the wrong host.
 * 3. localhost for development.
 *
 * Vercel exposes NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL (no protocol) as
 * long as "Automatically expose System Environment Variables" is on, which is
 * the default. It's the stable production domain, unlike VERCEL_URL which is
 * unique per deployment.
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const vercel = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;

  return "http://localhost:3000";
}
