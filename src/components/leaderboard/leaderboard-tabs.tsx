import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/app/leaderboard", label: "Deze challenge" },
  { href: "/app/leaderboard/records", label: "Aller tijden" },
];

/**
 * Plain links rather than client-side tabs: both views are server-rendered
 * and shareable, and this costs no JavaScript.
 */
export function LeaderboardTabs({ active }: { active: "challenge" | "records" }) {
  return (
    <nav className="flex rounded-lg border border-border bg-card p-1">
      {TABS.map((tab, i) => {
        const selected = (i === 0 ? "challenge" : "records") === active;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={selected ? "page" : undefined}
            className={cn(
              "flex h-9 flex-1 items-center justify-center rounded-md text-sm font-medium transition-colors",
              selected
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
