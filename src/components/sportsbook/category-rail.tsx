import Link from "next/link";
import { Clock, Layers } from "lucide-react";
import type { Category } from "@/lib/sportsbook/categories";
import { sportIconPath } from "@/lib/sportsbook/sport-icons";
import { cn } from "@/lib/utils";
import { colorForName } from "./team-badge";

/**
 * Horizontal filter rail. Plain links, so filtering costs no JavaScript and
 * survives a shared URL. Sports carry their own pictogram; competitions get a
 * colour disc with their initial, because a league's real emblem is its
 * trademark and not ours to ship.
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

  const iconPath = category.kind === "sport" ? sportIconPath(category.label) : null;
  if (iconPath) {
    // A mask, not an <img>: Tabler ships stroke="currentColor", which an image
    // resolves to black and loses on a dark background. As a mask the glyph
    // takes the surrounding text colour, so the active state just works.
    return (
      <span
        aria-hidden
        className={cn(
          "size-6 bg-current",
          active ? "text-accent-brand" : "text-muted-foreground"
        )}
        style={{
          maskImage: `url(${iconPath})`,
          WebkitMaskImage: `url(${iconPath})`,
          maskSize: "contain",
          WebkitMaskSize: "contain",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          maskPosition: "center",
          WebkitMaskPosition: "center",
        }}
      />
    );
  }

  // A ring rather than a solid fill, so a competition never shouts louder
  // than the sport it belongs to. Same treatment as the medal discs.
  const color = colorForName(category.label);
  return (
    <span
      className="flex size-7 items-center justify-center rounded-full border-2 text-xs font-semibold"
      style={{ borderColor: color, color, backgroundColor: `${color}1f` }}
      aria-hidden
    >
      {category.label.trim().charAt(0).toUpperCase()}
    </span>
  );
}
