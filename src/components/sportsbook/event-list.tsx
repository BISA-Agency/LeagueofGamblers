import { competitionMeta } from "@/lib/sportsbook/competitions";
import { EventCard, type EventWithOdds } from "./event-card";
import { CompetitionCrest } from "./sportsbook-nav";

/**
 * Grouped by competition, because that is how anyone reads a fixture list —
 * an Eredivisie match next to an NBA game is noise. Groups are ordered by
 * their earliest kick-off, and so are the cards inside them, so what is on
 * soonest still surfaces first.
 *
 * The heading carries the flag and the tidied-up league name, not the
 * provider's raw title, so a page of sections reads as a list of competitions
 * instead of a list of database values.
 */
export function EventList({ events }: { events: EventWithOdds[] }) {
  const groups = new Map<string, { sport: string; events: EventWithOdds[] }>();

  for (const event of events) {
    // One league is one sport key, so grouping on it can never split a
    // competition in two over a spelling change in the provider's title.
    const group = groups.get(event.sportKey) ?? { sport: event.sportLabel, events: [] };
    group.events.push(event);
    groups.set(event.sportKey, group);
  }

  const earliest = (list: EventWithOdds[]) => Math.min(...list.map((e) => e.startsAt.getTime()));

  const ordered = [...groups.entries()].sort(
    ([, a], [, b]) => earliest(a.events) - earliest(b.events)
  );

  return (
    <div className="space-y-7">
      {ordered.map(([sportKey, group]) => {
        const first = group.events[0];
        const meta = competitionMeta(sportKey, first.competition, first.sportLabel);

        return (
          <section key={sportKey} className="space-y-2.5">
            <h2 className="flex items-center gap-2 border-b border-border/70 pb-2">
              <CompetitionCrest league={meta} className="h-4 w-6" />
              <span className="truncate text-sm font-semibold tracking-tight">{meta.name}</span>
              {/* Boxing is its own competition; "Boksen Boksen" helps nobody. */}
              {meta.name !== group.sport && (
                <span className="truncate text-xs text-muted-foreground">{group.sport}</span>
              )}
              <span className="ml-auto shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                {group.events.length}
              </span>
            </h2>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 2xl:grid-cols-3">
              {group.events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
