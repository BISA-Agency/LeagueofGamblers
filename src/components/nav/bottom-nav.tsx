"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PendingHint } from "@/components/ui/pending-hint";
import { cn } from "@/lib/utils";
import { getNavItems, isNavItemActive } from "./nav-items";

export function BottomNav({ username, isAdmin }: { username: string; isAdmin: boolean }) {
  const pathname = usePathname();
  const items = getNavItems(username, isAdmin);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 md:hidden">
      <ul className="flex h-16 items-stretch">
        {items.map((item) => {
          const active = isNavItemActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "relative flex h-full min-h-11 flex-col items-center justify-center gap-1 px-0.5 text-[10px] leading-none",
                  active ? "text-accent-brand" : "text-muted-foreground"
                )}
              >
                <PendingHint className="bg-accent-brand inset-x-2 top-0 h-0.5 rounded-full" />
                <Icon className="size-5 shrink-0" />
                <span className="max-w-full truncate">{item.shortLabel ?? item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
