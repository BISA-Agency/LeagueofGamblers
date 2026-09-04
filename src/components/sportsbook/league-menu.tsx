"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { filterHref, type CountryGroup } from "@/lib/sportsbook/categories";
import { cn } from "@/lib/utils";
import { CompetitionCrest } from "./competition-crest";

/** How long the menu waits after the pointer leaves before closing. */
const CLOSE_DELAY_MS = 160;

/**
 * The complete competition list, filed by country, behind the first chip in
 * the rail.
 *
 * The pill row shows the biggest leagues and stops there; this is what makes
 * the rest reachable without the row growing without limit. Countries on the
 * left, that country's leagues in a panel to the right — so twenty countries
 * cost twenty rows, not two hundred chips.
 *
 * Opens on hover for a mouse and on tap for a finger. Radix keeps the
 * keyboard working (arrows, Escape, and right-arrow into a submenu) and closes
 * it on an outside click; the hover handling is ours, including the short
 * delay that lets the pointer cross the gap between chip and panel without the
 * menu vanishing on the way.
 */
export function LeagueMenu({
  countries,
  filter,
  totalCount,
}: {
  countries: CountryGroup[];
  filter: { sport: string; league: string | null; soon: boolean };
  totalCount: number;
}) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };

  useEffect(() => cancelClose, []);

  // Touch has no hover, so a tap has to do the opening — and a tap fires
  // pointerenter too, which would otherwise open and immediately toggle shut.
  const hoverProps = {
    onPointerEnter: (e: React.PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      cancelClose();
      setOpen(true);
    },
    onPointerLeave: (e: React.PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      scheduleClose();
    },
  };

  const isActive = filter.league === null;

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        if (!next) cancelClose();
        setOpen(next);
      }}
      // Not modal: a hover menu that locks the page behind it is a trap.
      modal={false}
    >
      <DropdownMenuTrigger
        {...hoverProps}
        className={cn(
          "flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs font-medium outline-none transition-colors",
          isActive
            ? "border-accent-brand bg-accent-brand/12 text-accent-brand"
            : "border-border bg-card/60 text-muted-foreground hover:border-foreground/25 hover:text-foreground"
        )}
      >
        Alle competities
        <ChevronDown
          className={cn("size-3.5 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        {...hoverProps}
        align="start"
        collisionPadding={12}
        className="max-h-[70vh] w-56 overflow-y-auto"
      >
        <DropdownMenuItem asChild>
          <Link
            href={filterHref({ sport: filter.sport, soon: filter.soon })}
            className={cn("justify-between", isActive && "text-accent-brand")}
          >
            Alle competities
            <span className="text-xs tabular-nums text-muted-foreground">{totalCount}</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {countries.map((country, i) => (
          <Fragment key={country.code ?? "internationaal"}>
            {/* A line where the big leagues stop, so the order reads as a
                decision rather than as a sort that gave up halfway. */}
            {!country.featured && i > 0 && countries[i - 1].featured && (
              <DropdownMenuSeparator />
            )}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="gap-2 px-1.5 py-1.5">
                <CompetitionCrest country={country.code} />
                <span className="truncate">{country.name}</span>
                <span className="ml-auto pl-2 text-xs tabular-nums text-muted-foreground">
                  {country.count}
                </span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent
                {...hoverProps}
                collisionPadding={12}
                // Clamped to what is actually left of the screen: a phone has
                // no room for a flyout beside a menu, and a panel that runs off
                // the edge loses its counts rather than its name.
                className="max-h-[60vh] w-52 max-w-[var(--radix-dropdown-menu-content-available-width)] overflow-y-auto"
              >
                {country.leagues.map((league) => (
                  <DropdownMenuItem key={league.key} asChild>
                    <Link
                      href={filterHref({ league: league.key, soon: filter.soon })}
                      className={cn(
                        "justify-between gap-3",
                        filter.league === league.key && "text-accent-brand"
                      )}
                    >
                      <span className="truncate">{league.name}</span>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {league.count}
                      </span>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
