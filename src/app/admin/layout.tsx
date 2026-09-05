import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminEmail } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

const ADMIN_NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/challenges", label: "Challenges" },
  { href: "/admin/proof-bets", label: "Bewijsbetten" },
  { href: "/admin/missions", label: "LoG-missies" },
  { href: "/admin/badges", label: "Badges" },
  { href: "/admin/payments", label: "Pot & betalingen" },
  { href: "/admin/prize-tiers", label: "Prize tiers" },
  // Testweergave; verwijderen als het aanbrengtegoed niet doorgaat.
  { href: "/admin/referrals", label: "Aanbrengtegoed" },
];

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
      {/* Wraps rather than forcing a fixed row — six links side by side were
          480px wide and pushed every admin page into horizontal scroll on a
          phone. */}
      <nav className="mb-6 flex flex-wrap gap-x-4 gap-y-1 border-b border-border pb-3 text-sm">
        {ADMIN_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex min-h-9 items-center text-muted-foreground hover:text-foreground"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
