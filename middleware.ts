import { NextResponse, type NextRequest } from "next/server";
import { isAdminEmail } from "@/lib/auth/admin";
import { normalizeInviteCode } from "@/lib/referrals/code";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * An invite code arrives as ?ref= on whatever link was shared — usually a
 * challenge page — and has to survive the whole magic-link round trip before
 * onboarding can use it, so it is parked in a cookie here rather than carried
 * through every redirect. Read once at onboarding and cleared.
 */
const REFERRAL_COOKIE = "log_ref";
const REFERRAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function captureReferral(request: NextRequest, response: NextResponse) {
  const raw = request.nextUrl.searchParams.get("ref");
  if (!raw) return;
  const code = normalizeInviteCode(raw);
  // A first invite wins: overwriting would let any later link steal the credit.
  if (!code || request.cookies.get(REFERRAL_COOKIE)) return;
  response.cookies.set(REFERRAL_COOKIE, code, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: REFERRAL_COOKIE_MAX_AGE,
  });
}

// Next serves generated metadata images from hashed paths like
// /opengraph-image-1c1a04 — no file extension, so the matcher below doesn't
// skip them. They're share cards and icons: public by definition, and
// redirecting them to /login means link previews show a login screen.
const METADATA_ASSET = /(^|\/)(opengraph-image|twitter-image|icon|apple-icon)(-[a-z0-9]+)?$/i;

function isPublicPath(pathname: string) {
  if (pathname === "/") return true;
  if (pathname.startsWith("/rules")) return true;
  if (pathname.startsWith("/login")) return true;
  if (pathname.startsWith("/c/")) return true;
  if (pathname.startsWith("/b/")) return true;
  if (pathname.startsWith("/wrapped/")) return true;
  if (pathname.startsWith("/api/")) return true;
  if (pathname.startsWith("/auth/")) return true;
  if (METADATA_ASSET.test(pathname)) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // The cookie is applied to whatever response actually goes back, not just
  // the pass-through one: an invite link to a signed-in-only page redirects
  // to /login, and setting it on the wrong response would drop the credit
  // exactly when someone is being invited.
  const withReferral = (response: NextResponse) => {
    captureReferral(request, response);
    return response;
  };

  const toLogin = () => {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return withReferral(NextResponse.redirect(url));
  };

  if (pathname.startsWith("/admin")) {
    if (!user || !isAdminEmail(user.email)) return toLogin();
    return withReferral(supabaseResponse);
  }

  if (!isPublicPath(pathname) && !user) return toLogin();

  return withReferral(supabaseResponse);
}

export const config = {
  matcher: [
    // Anything with a file extension is a static asset and must skip the auth
    // check — otherwise /robots.txt and the landing-page screenshots get
    // redirected to /login for logged-out visitors (and crawlers).
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|txt|xml|json|webmanifest|woff|woff2|pdf)$).*)",
  ],
};
