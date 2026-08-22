import { EventCard, type EventWithOdds } from "./event-card";

export function EventList({ events }: { events: EventWithOdds[] }) {
  const bySport = new Map<string, EventWithOdds[]>();
  for (const event of events) {
    const list = bySport.get(event.sportLabel) ?? [];
    list.push(event);
    bySport.set(event.sportLabel, list);
  }

  return (
    <div className="space-y-6">
      {Array.from(bySport.entries()).map(([sport, sportEvents]) => (
        <section key={sport} className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">{sport}</h2>
          <div className="space-y-2">
            {sportEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
