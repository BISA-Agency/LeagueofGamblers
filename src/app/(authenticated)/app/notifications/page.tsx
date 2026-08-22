import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { markAllNotificationsRead } from "@/actions/notifications";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { formatNotification } from "@/lib/notifications/format";
import { notifications } from "@drizzle/schema";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Notificaties" };

const dateFormatter = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Amsterdam",
});

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rows = await db.query.notifications.findMany({
    where: eq(notifications.userId, user.id),
    orderBy: desc(notifications.createdAt),
    limit: 50,
  });
  const hasUnread = rows.some((n) => n.readAt === null);

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">Notificaties</h1>
        {hasUnread && (
          <form action={markAllNotificationsRead}>
            <Button type="submit" variant="outline" size="sm" className="h-11">
              Alles gelezen
            </Button>
          </form>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nog geen notificaties.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((n) => {
            const { title, body, href } = formatNotification(n);
            const content = (
              <div
                className={cn(
                  "rounded-lg border p-3",
                  n.readAt === null ? "border-accent-brand/40 bg-accent-brand/5" : "border-border"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{title}</p>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {dateFormatter.format(n.createdAt)}
                  </span>
                </div>
                {body && <p className="mt-0.5 text-sm text-muted-foreground">{body}</p>}
              </div>
            );
            return (
              <li key={n.id}>{href ? <Link href={href}>{content}</Link> : content}</li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
