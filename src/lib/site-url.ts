const LOCAL = "http://localhost:3000";

/**
 * Turns whatever someone typed into an env var into a usable origin.
 * "www.example.nl", "https://www.example.nl/", "http://localhost:3000" all
 * work — a bare hostname is the normal way people write a domain, and it
 * used to reach `new URL()` unchanged and fail the production build.
 * Returns null when it can't be salvaged, so callers can fall through.
 */
function normalize(value: string | undefined): string | null {
  const trimmed = value?.trim().replace(/\/+$/, "");
  if (!trimmed) return null;

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    // new URL() is lenient enough to accept "https://ht!tp://:::" and hand
    // back an origin of "https://ht!tp". Reject anything that isn't a
    // plausible hostname so a typo falls through to the next option instead
    // of quietly becoming the address magic links point at.
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i.test(url.hostname)) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

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
 *
 * A malformed value falls through to the next option rather than throwing:
 * a typo in an env var should not take the whole build down.
 */
export function getSiteUrl(): string {
  return (
    normalize(process.env.NEXT_PUBLIC_SITE_URL) ??
    normalize(process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL) ??
    LOCAL
  );
}
