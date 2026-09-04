import Link from "next/link";
import { Clock } from "lucide-react";
import {
  ALL_SPORTS,
  filterHref,
  groupLeaguesByCountry,
  type LeagueChip,
  type SportsbookFilter,
  type SportTab,
} from "@/lib/sportsbook/categories";
import { sportIconPath } from "@/lib/sportsbook/sport-icons";
import { cn } from "@/lib/utils";
import { CompetitionCrest } from "./competition-crest";
import { FilterScroller } from "./filter-scroller";
import { LeagueMenu } from "./league-menu";

/**
 * Two rows: sport on top, the leagues inside it underneath. Links, not state,
 * so a filter costs no round trip to apply and survives a shared URL — and no
 * dropdown for the sports, because with four of them a menu would hide the
 * whole choice behind a tap to save a row we have room for.
 *
 * The rail sticks under the app header, because the fixture list is long and a
 * filter you have to scroll back up to reach is a filter nobody uses twice.
 */

/**
 * How many league chips the second row shows before the rest is left to the
 * country menu. Seventeen football leagues already run well off the side of a
 * phone, and the admin can switch on more at any time; past a handful, chips
 * stop being a row you scan and become a row you drag.
 */
const VISIBLE_LEAGUE_PILLS = 6;

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
  const countries = groupLeaguesByCountry(leagues);
  const leagueTotal = leagues.reduce((sum, l) => sum + l.count, 0);

  // The chosen league always gets a chip, even when it is not one of the
  // biggest — otherwise picking Superettan from the menu leaves a row in which
  // nothing is highlighted and no sign of what is being filtered.
  const pills = leagues.slice(0, VISIBLE_LEAGUE_PILLS);
  const active = leagues.find((l) => l.key === filter.league);
  if (active && !pills.includes(active)) pills.push(active);

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
        <div className="flex items-center gap-2">
          <LeagueMenu countries={countries} filter={filter} totalCount={leagueTotal} />
          <FilterScroller className="min-w-0 flex-1">
            {pills.map((league) => (
              <Pill
                key={league.key}
                href={filterHref({ league: league.key, soon: filter.soon })}
                active={filter.league === league.key}
                count={league.count}
              >
                <CompetitionCrest country={league.country} />
                {league.name}
              </Pill>
            ))}
          </FilterScroller>
        </div>
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
