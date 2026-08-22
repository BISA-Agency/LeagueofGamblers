import { and, eq, lte, ne } from "drizzle-orm";
import type { Metadata } from "next";
import { settleCustomMarket } from "@/actions/admin/custom-events";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { events } from "@drizzle/schema";

export const metadata: Metadata = { title: "Settlement-queue" };

const dateTimeFormatter = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Amsterdam",
});

export default async function SettlementQueuePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const pendingEvents = await db.query.events.findMany({
    where: and(
      eq(events.challengeId, id),
      eq(events.source, "admin"),
      ne(events.status, "finished"),
      ne(events.status, "void"),
      lte(events.startsAt, new Date())
    ),
    with: { markets: { with: { outcomes: true } } },
    orderBy: (e, { asc }) => asc(e.startsAt),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Settlement-queue</h1>
        <p className="text-sm text-muted-foreground">
          Custom events die al begonnen zijn en nog een uitslag nodig hebben.
        </p>
      </div>

      {pendingEvents.length === 0 && (
        <p className="text-sm text-muted-foreground">Niets te settelen.</p>
      )}

      <div className="space-y-4">
        {pendingEvents.map((event) => (
          <Card key={event.id}>
            <CardHeader>
              <CardTitle>{event.name}</CardTitle>
              <CardDescription className="tabular-nums">
                {event.sportLabel} · begon {dateTimeFormatter.format(event.startsAt)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {event.markets.map((market) => (
                <div key={market.id} className="space-y-2">
                  <p className="text-sm font-medium">{market.label}</p>
                  {market.status === "settled" ? (
                    <p className="text-xs text-muted-foreground">Al gesetteld.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {market.outcomes.map((outcome) => (
                        <form
                          key={outcome.id}
                          action={settleCustomMarket.bind(null, market.id, id, outcome.id)}
                        >
                          <Button type="submit" size="sm" variant="outline" className="h-11">
                            {outcome.label} wint
                          </Button>
                        </form>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
