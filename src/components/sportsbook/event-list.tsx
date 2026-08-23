import { EventCard, type EventWithOdds } from "./event-card";

/**
 * Flat and chronological. Grouping by sport used to add a heading above every
 * card that already names its own sport and competition, and it threw away
 * the "what starts soonest" order that matters most here. The category rail
 * is how you slice by sport now.
 */
export function EventList({ events }: { events: EventWithOdds[] }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 2xl:grid-cols-3">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
