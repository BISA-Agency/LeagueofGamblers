import Link from "next/link";
import { Clock, Trophy } from "lucide-react";
import {
  ALL_SPORTS,
  filterHref,
  type LeagueChip,
  type SportsbookFilter,
  type SportTab,
} from "@/lib/sportsbook/categories";
import { flagPath } from "@/lib/sportsbook/competitions";
import { sportIconPath } from "@/lib/sportsbook/sport-icons";
import { cn } from "@/lib/utils";
import { FilterScroller } from "./filter-scroller";

/**
 * Two rows of links: sport on top, the leagues inside it underneath. Links,
 * not state, so a filter costs no round trip to apply and survives a shared
 * URL — and no dropdown, because with four sports a menu would hide the whole
 * choice behind a tap to save a row we have room for.
 *
 * The rail sticks under the app header, because the fixture list is long and a
 * filter you have to scroll back up to reach is a filter nobody uses twice.
 */
export function SportsbookNav({
  sports,
  leagues,
  filter,
  soonCount,
}: {
  sports: SportTab[];
  leagues: LeagueChip[];
  filter: SportsbookFilter;
  soonCount: number;
}) {
  return (
    <nav
      aria-label="Filter wedstrijden"
      className="sticky top-14 z-20 -mx-4 space-y-2 border-b border-border/70 bg-background/85 px-4 pb-3 pt-3 backdrop-blur supports-backdrop-filter:bg-background/70"
    >
      <div className="flex items-center gap-2">
        <FilterScroller className="min-w-0 flex-1">
          {sports.map((sport) => (
            <Pill
              key={sport.key}
              href={filterHref({ sport: sport.key, soon: filter.soon })}
              active={filter.sport === sport.key}
              count={sport.count}
            >
              <SportGlyph label={sport.label} active={filter.sport === sport.key} />
              {sport.key === ALL_SPORTS ? "Alles" : sport.label}
            </Pill>
          ))}
        </FilterScroller>

        {soonCount > 0 && (
          <Link
            href={filterHref({ sport: filter.sport, league: filter.league, soon: !filter.soon })}
            aria-pressed={filter.soon}
            className={cn(
              "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
              filter.soon
                ? "border-accent-brand bg-accent-brand/12 text-accent-brand"
                : "border-border bg-card/60 text-muted-foreground hover:border-foreground/25 hover:text-foreground"
            )}
          >
            <Clock className="size-3.5" />
            <span className="hidden sm:inline">Binnen 24 uur</span>
            <span className="sm:hidden">24u</span>
            <span
              className={cn(
                "rounded-full px-1.5 text-[10px] font-semibold tabular-nums",
                filter.soon ? "bg-accent-brand/20" : "bg-secondary text-muted-foreground"
              )}
            >
              {soonCount}
            </span>
          </Link>
        )}
      </div>

      {leagues.length > 1 && (
        <FilterScroller>
          <Pill
            href={filterHref({ sport: filter.sport, soon: filter.soon })}
            active={filter.league === null}
          >
            Alle competities
          </Pill>
          {leagues.map((league) => (
            <Pill
              key={league.key}
              href={filterHref({ league: league.key, soon: filter.soon })}
              active={filter.league === league.key}
              count={league.count}
            >
              <CompetitionCrest league={league} />
              {league.name}
            </Pill>
          ))}
        </FilterScroller>
      )}
    </nav>
  );
}

function Pill({
  href,
  active,
  count,
  children,
}: {
  href: string;
  active: boolean;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs font-medium transition-colors",
        active
          ? // The green frame the rest of the app uses for "this is the one".
            "border-accent-brand bg-accent-brand/12 text-accent-brand"
          : "border-border bg-card/60 text-muted-foreground hover:border-foreground/25 hover:text-foreground"
      )}
    >
      {children}
      {count !== undefined && (
        <span
          className={cn(
            "rounded-full px-1.5 text-[10px] font-semibold tabular-nums",
            active ? "bg-accent-brand/20" : "bg-secondary text-muted-foreground"
          )}
        >
          {count}
        </span>
      )}
    </Link>
  );
}

function SportGlyph({ label, active }: { label: string; active: boolean }) {
  const iconPath = sportIconPath(label);
  if (!iconPath) return null;
  // A mask, not an <img>: Tabler ships stroke="currentColor", which an image
  // resolves to black and loses on a dark background.
  return (
    <span
      aria-hidden
      className={cn("size-4 shrink-0 bg-current", active ? "text-accent-brand" : "text-current")}
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

/**
 * The flag, or a trophy in the same rectangle for anything supranational — a
 * Champions League night belongs to no country, and forcing one on it would be
 * wrong as well as ugly.
 */
export function CompetitionCrest({
  league,
  className,
}: {
  league: Pick<LeagueChip, "name" | "country">;
  className?: string;
}) {
  const flag = flagPath(league.country);
  if (flag) {
    return (
      // Plain <img>: these are tiny local SVGs, and next/image would add a
      // request to the optimiser for something already 400 bytes.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={flag}
        alt=""
        aria-hidden
        className={cn(
          "h-3.5 w-5 shrink-0 rounded-[2px] object-cover ring-1 ring-white/15",
          className
        )}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-3.5 w-5 shrink-0 items-center justify-center rounded-[2px] bg-secondary ring-1 ring-white/10",
        className
      )}
    >
      <Trophy className="size-2.5 text-muted-foreground" />
    </span>
  );
}
