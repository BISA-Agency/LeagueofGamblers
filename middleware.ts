import { NextResponse, type NextRequest } from "next/server";
import { isAdminEmail } from "@/lib/auth/admin";
import { updateSession } from "@/lib/supabase/middleware";

function isPublicPath(pathname: string) {
  if (pathname === "/") return true;
  if (pathname.startsWith("/rules")) return true;
  if (pathname.startsWith("/login")) return true;
  if (pathname.startsWith("/c/")) return true;
  if (pathname.startsWith("/wrapped/")) return true;
  if (pathname.startsWith("/api/")) return true;
  if (pathname.startsWith("/auth/")) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    if (!user || !isAdminEmail(user.email)) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  if (!isPublicPath(pathname) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Anything with a file extension is a static asset and must skip the auth
    // check — otherwise /robots.txt and the landing-page screenshots get
    // redirected to /login for logged-out visitors (and crawlers).
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|txt|xml|json|webmanifest|woff|woff2)$).*)",
  ],
};
