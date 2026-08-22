"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { getNavItems, isNavItemActive } from "./nav-items";

export function Sidebar({ username }: { username: string }) {
  const pathname = usePathname();
  const items = getNavItems(username);

  return (
    <aside className="hidden w-60 shrink-0 border-r border-border md:flex md:flex-col">
      <div className="px-5 py-6">
        <Link href="/app" className="text-lg font-semibold tracking-tight">
          League of <span className="text-accent-brand">Gamblers</span>
        </Link>
      </div>
      <nav className="flex-1 px-3">
        <ul className="space-y-1">
          {items.map((item) => {
            const active = isNavItemActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                    active
                      ? "bg-secondary text-accent-brand"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
