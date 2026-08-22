import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminEmail } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) redirect("/login");

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <Link href="/admin" className="text-lg font-semibold">
          Admin
        </Link>
        <Link href="/app" className="text-sm text-muted-foreground underline underline-offset-2">
          Terug naar de app
        </Link>
      </header>
      <nav className="mb-6 flex gap-4 border-b border-border pb-3 text-sm">
        <Link href="/admin" className="text-muted-foreground hover:text-foreground">
          Dashboard
        </Link>
        <Link href="/admin/challenges" className="text-muted-foreground hover:text-foreground">
          Challenges
        </Link>
        <Link href="/admin/proof-bets" className="text-muted-foreground hover:text-foreground">
          Bewijsbetten
        </Link>
        <Link href="/admin/badges" className="text-muted-foreground hover:text-foreground">
          Badges
        </Link>
        <Link href="/admin/payments" className="text-muted-foreground hover:text-foreground">
          Pot & betalingen
        </Link>
        <Link href="/admin/prize-tiers" className="text-muted-foreground hover:text-foreground">
          Prize tiers
        </Link>
      </nav>
      {children}
    </div>
  );
}
