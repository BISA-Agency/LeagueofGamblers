import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { PendingHint } from "@/components/ui/pending-hint";
import {
  filterHref,
  type FixtureGroup,
  type SportsbookFilter,
} from "@/lib/sportsbook/categories";
import { competitionMeta } from "@/lib/sportsbook/competitions";
import type { MarketWithOutcomes } from "@/lib/sportsbook/load-odds";
import type { Event } from "@drizzle/schema";
import { EventCard } from "./event-card";
import { CompetitionCrest } from "./competition-crest";

/**
 * Grouped by competition, because that is how anyone reads a fixture list —
 * an Eredivisie match next to an NBA game is noise. Groups are ordered by
 * their earliest kick-off, and so are the cards inside them, so what is on
 * soonest still surfaces first.
 *
 * Six fixtures a competition, then a link for the rest. At seven kilobytes a
 * card, showing all of them made the page 1.2 MB — most of it competitions
 * the reader scrolled straight past. The link adds the competition to ?open=
 * and the server sends its remaining cards; nothing is rendered and hidden,
 * which would have saved nobody anything.
 *
 * The grouping itself happens in the page (groupFixtures), so it can fetch
 * odds for exactly the cards below and no others.
 */
export function EventList({
  groups,
  oddsByEvent,
  filter,
}: {
  groups: FixtureGroup<Event>[];
  oddsByEvent: Map<string, MarketWithOutcomes[]>;
  filter: SportsbookFilter;
}) {
  return (
    <div className="space-y-7">
      {groups.map((group) => {
        const meta = competitionMeta(group.sportKey, group.competition, group.sportLabel);

        return (
          <section key={group.sportKey} className="space-y-2.5">
            {/* The heading is the way into a competition. It reads as a label,
                so it needs the chevron to say it is also a door — and it stops
                being a link once you are already inside that competition. */}
            <h2 className="border-b border-border/70 pb-2">
              {filter.league === group.sportKey ? (
                <span className="flex items-center gap-2">
                  <CompetitionCrest country={meta.country} className="h-4 w-6" />
                  <span className="truncate text-sm font-semibold tracking-tight">{meta.name}</span>
                  <GroupMeta group={group} meta={meta} />
                </span>
              ) : (
                <Link
                  href={filterHref({ league: group.sportKey })}
                  className="group/head relative -my-1 flex items-center gap-2 py-1 transition-colors hover:text-accent-brand"
                >
                  <PendingHint className="-inset-x-2 inset-y-0 rounded-md bg-accent-brand/10" />
                  <CompetitionCrest country={meta.country} className="h-4 w-6" />
                  <span className="truncate text-sm font-semibold tracking-tight">{meta.name}</span>
                  <GroupMeta group={group} meta={meta} />
                  <ChevronRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover/head:translate-x-0.5 group-hover/head:text-accent-brand" />
                </Link>
              )}
            </h2>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 2xl:grid-cols-3">
              {group.shown.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  markets={oddsByEvent.get(event.id) ?? []}
                />
              ))}
            </div>

            {group.hidden > 0 && (
              <Link
                href={filterHref({ ...filter, open: [...filter.open, group.sportKey] })}
                // Not scrolling to the top: you asked for more of this
                // competition, so the page should stay where you were.
                scroll={false}
                className="flex h-11 items-center justify-center rounded-lg border border-border bg-card/60 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground"
              >
                Toon {group.hidden} {group.hidden === 1 ? "wedstrijd" : "wedstrijden"} meer
              </Link>
            )}
          </section>
        );
      })}
    </div>
  );
}

/** The sport name (when it differs) and the fixture count, on the right. */
function GroupMeta({
  group,
  meta,
}: {
  group: FixtureGroup<Event>;
  meta: { name: string };
}) {
  return (
    <>
      {/* Boxing is its own competition; "Boksen Boksen" helps nobody. */}
      {meta.name !== group.sportLabel && (
        <span className="truncate text-xs font-normal text-muted-foreground">
          {group.sportLabel}
        </span>
      )}
      <span className="ml-auto shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
        {group.shown.length + group.hidden}
      </span>
    </>
  );
}
