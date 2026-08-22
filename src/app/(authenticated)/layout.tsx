import { and, count, eq, isNull } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { UnpaidBuyInBanner } from "@/components/challenges/unpaid-buy-in-banner";
import { BottomNav } from "@/components/nav/bottom-nav";
import { Sidebar } from "@/components/nav/sidebar";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { db } from "@/lib/db";
import { notifications, profiles } from "@drizzle/schema";
import { createClient } from "@/lib/supabase/server";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await db.query.profiles.findFirst({ where: eq(profiles.id, user.id) });
  if (!profile?.rulesAcceptedAt) redirect("/onboarding");

  const [unread] = await db
    .select({ n: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));

  return (
    <div className="flex min-h-dvh">
      <Sidebar username={profile.username} xp={profile.xp} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-border bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/80">
          <Link href="/app" className="text-base font-semibold tracking-tight md:invisible">
            League of <span className="text-accent-brand">Gamblers</span>
          </Link>
          <NotificationBell unreadCount={unread.n} />
        </header>
        <UnpaidBuyInBanner userId={user.id} />
        <main className="flex-1 pb-20 md:pb-0">{children}</main>
      </div>
      <BottomNav username={profile.username} />
    </div>
  );
}
