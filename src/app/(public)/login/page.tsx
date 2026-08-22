import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Inloggen" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; mode?: string }>;
}) {
  const { next, mode } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-12">
      <Link href="/" className="mb-8 text-center text-lg font-semibold tracking-tight">
        League of <span className="text-accent-brand">Gamblers</span>
      </Link>
      <LoginForm next={next ?? "/app"} mode={mode === "register" ? "register" : "login"} />
    </main>
  );
}
