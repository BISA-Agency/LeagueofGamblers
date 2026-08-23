import { EventCard, type EventWithOdds } from "./event-card";

/**
 * Grouped by competition, because that is how anyone reads a fixture list —
 * an Eredivisie match next to an NBA game is noise. Groups are ordered by
 * their earliest kick-off, and so are the cards inside them, so what is on
 * soonest still surfaces first.
 */
export function EventList({ events }: { events: EventWithOdds[] }) {
  const groups = new Map<string, { sport: string; competition: string | null; events: EventWithOdds[] }>();

  for (const event of events) {
    const key = `${event.sportLabel}|${event.competition ?? ""}`;
    const group = groups.get(key) ?? {
      sport: event.sportLabel,
      competition: event.competition,
      events: [],
    };
    group.events.push(event);
    groups.set(key, group);
  }

  const earliest = (list: EventWithOdds[]) =>
    Math.min(...list.map((e) => e.startsAt.getTime()));

  const ordered = [...groups.values()].sort((a, b) => earliest(a.events) - earliest(b.events));

  return (
    <div className="space-y-6">
      {ordered.map((group) => (
        <section key={`${group.sport}|${group.competition}`} className="space-y-2">
          <h2 className="flex items-baseline gap-1.5 text-sm font-medium">
            {group.competition ?? group.sport}
            {group.competition && (
              <span className="text-xs font-normal text-muted-foreground">{group.sport}</span>
            )}
            <span className="text-xs font-normal tabular-nums text-muted-foreground">
              · {group.events.length}
            </span>
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 2xl:grid-cols-3">
            {group.events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
