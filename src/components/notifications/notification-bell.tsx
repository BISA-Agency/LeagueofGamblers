import { Bell } from "lucide-react";
import Link from "next/link";

export function NotificationBell({ unreadCount }: { unreadCount: number }) {
  return (
    <Link
      href="/app/notifications"
      aria-label={
        unreadCount > 0 ? `Notificaties, ${unreadCount} ongelezen` : "Notificaties"
      }
      className="relative flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
    >
      <Bell className="size-5" />
      {unreadCount > 0 && (
        <span className="absolute right-1.5 top-1.5 flex min-w-4 items-center justify-center rounded-full bg-accent-brand px-1 text-[10px] font-semibold tabular-nums text-background">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
