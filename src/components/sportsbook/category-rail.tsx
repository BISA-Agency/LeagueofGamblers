import Link from "next/link";
import { Clock, Layers } from "lucide-react";
import type { Category } from "@/lib/sportsbook/categories";
import { cn } from "@/lib/utils";
import { colorForName } from "./team-badge";

/**
 * Horizontal filter rail. Plain links, so filtering costs no JavaScript and
 * survives a shared URL. Sports and competitions get a colour disc with their
 * initial rather than a pictogram — lucide has no honest icon for most sports,
 * and the disc language is already used for teams.
 */
export function CategoryRail({
  categories,
  active,
}: {
  categories: Category[];
  active: string;
}) {
  return (
    <nav
      aria-label="Filter op sport of competitie"
      className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <ul className="flex w-max gap-3 pb-1">
        {categories.map((c) => {
          const isActive = c.key === active;
          return (
            <li key={c.key}>
              <Link
                href={c.key === "alles" ? "/app/sportsbook" : `/app/sportsbook?c=${c.key}`}
                aria-current={isActive ? "page" : undefined}
                className="flex w-16 flex-col items-center gap-1.5 outline-none"
              >
                <span
                  className={cn(
                    "flex size-12 items-center justify-center rounded-full border transition-colors",
                    isActive
                      ? "border-accent-brand bg-accent-brand/10"
                      : "border-border bg-card hover:border-foreground/25"
                  )}
                >
                  <CategoryGlyph category={c} active={isActive} />
                </span>
                <span
                  className={cn(
                    "w-full truncate text-center text-[10px] leading-tight",
                    isActive ? "text-accent-brand" : "text-muted-foreground"
                  )}
                >
                  {c.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function CategoryGlyph({ category, active }: { category: Category; active: boolean }) {
  if (category.kind === "all") {
    return <Layers className={cn("size-5", active ? "text-accent-brand" : "text-muted-foreground")} />;
  }
  if (category.kind === "soon") {
    return <Clock className={cn("size-5", active ? "text-accent-brand" : "text-muted-foreground")} />;
  }
  const color = colorForName(category.label);
  return (
    <span
      className="flex size-7 items-center justify-center rounded-full text-xs font-semibold text-white"
      style={{ backgroundColor: color }}
      aria-hidden
    >
      {category.label.trim().charAt(0).toUpperCase()}
    </span>
  );
}
