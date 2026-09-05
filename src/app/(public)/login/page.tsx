import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Inloggen" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; mode?: string }>;
}) {
  const { next, mode } = await searchParams;

  /**
   * Already signed in? Then this page has nothing to ask.
   *
   * The session was there the whole time — /app opens straight up — but the
   * front page's "Inloggen" button led here regardless, and here always drew
   * the form. So people who were logged in were asked for a magic link they
   * did not need, waited for an email, and concluded the app forgets them.
   *
   * Fixed here rather than on the landing page on purpose: that page is
   * static, and making it read the session to relabel one button would cost
   * every visitor the cache for the benefit of the few who are signed in.
   * A redirect costs nothing and is invisible.
   */
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Only ever to our own paths: `next` comes off the query string, so an
  // absolute URL there would turn this into an open redirect.
  if (user) redirect(next?.startsWith("/") ? next : "/app");

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-12">
      <Link href="/" className="mb-8 text-center text-lg font-semibold tracking-tight">
        League of <span className="text-accent-brand">Gamblers</span>
      </Link>
      <LoginForm next={next ?? "/app"} mode={mode === "register" ? "register" : "login"} />
    </main>
  );
}
