import { and, asc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { EventList } from "@/components/sportsbook/event-list";
import { db } from "@/lib/db";
import { challengeParticipants, events } from "@drizzle/schema";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Sportsbook" };

export default async function SportsbookPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const participation = await db.query.challengeParticipants.findFirst({
    where: eq(challengeParticipants.userId, user.id),
    with: { challenge: true },
  });

  if (!participation) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-lg font-semibold">Sportsbook</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Je doet nog niet mee aan een challenge. Ga naar Challenges om je aan te melden.
        </p>
      </div>
    );
  }

  if (participation.status !== "active") {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-lg font-semibold">Sportsbook</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {participation.challenge.name} is nog niet live — het sportsbook opent zodra de
          challenge start.
        </p>
      </div>
    );
  }

  const upcomingEvents = await db.query.events.findMany({
    where: and(eq(events.challengeId, participation.challengeId), eq(events.status, "upcoming")),
    orderBy: asc(events.startsAt),
    with: { markets: { with: { outcomes: true } } },
  });

  return (
    <div className="px-4 py-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold tracking-tight">Sportsbook</h1>
        <p className="text-sm text-muted-foreground">{participation.challenge.name}</p>
      </div>

      {upcomingEvents.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nog geen wedstrijden geïmporteerd voor deze challenge.
        </p>
      ) : (
        <EventList events={upcomingEvents} />
      )}
    </div>
  );
}
