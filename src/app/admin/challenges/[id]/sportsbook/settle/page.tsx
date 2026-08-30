import { and, eq, lte, ne, or } from "drizzle-orm";
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

  /**
   * How long after kick-off an imported fixture is treated as stuck.
   *
   * The results cron keeps polling for three days, so a result that simply
   * arrives late still settles itself and never reaches this page. What lands
   * here is the fixture that was abandoned, postponed, or renamed upstream —
   * and until it is settled by hand its bets stay open, which blocks the
   * challenge from being finished and paid out.
   */
  const OVERDUE_HOURS = 24;
  const now = new Date();
  const overdueBefore = new Date(now.getTime() - OVERDUE_HOURS * 3_600_000);

  const pendingEvents = await db.query.events.findMany({
    where: and(
      eq(events.challengeId, id),
      ne(events.status, "finished"),
      ne(events.status, "void"),
      or(
        // Admin events never settle themselves — they belong here from kick-off.
        and(eq(events.source, "admin"), lte(events.startsAt, now)),
        // Imported ones only once the automatic path has clearly given up.
        and(eq(events.source, "odds_api"), lte(events.startsAt, overdueBefore))
      )
    ),
    with: { markets: { with: { outcomes: true } } },
    orderBy: (e, { asc }) => asc(e.startsAt),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Settlement-queue</h1>
        <p className="text-sm text-muted-foreground">
          Custom events vanaf hun aftrap, plus geïmporteerde wedstrijden waar na 24 uur nog
          geen uitslag voor binnen is. Zolang die openstaan kan de challenge niet afgerond worden.
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
