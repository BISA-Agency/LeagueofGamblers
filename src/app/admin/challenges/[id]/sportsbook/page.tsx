import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  reopenEvent,
  reopenMarket,
  suspendEvent,
  suspendMarket,
  voidEventAction,
} from "@/actions/admin/custom-events";
import { runOddsImportPreview } from "@/actions/admin/odds-import";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { challenges, events, oddsImports } from "@drizzle/schema";

export const metadata: Metadata = { title: "Sportsbook beheren" };

const IMPORT_STATUS_LABEL: Record<string, string> = {
  preview: "Preview",
  published: "Gepubliceerd",
  discarded: "Verworpen",
};

const dateTimeFormatter = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Amsterdam",
});

export default async function AdminSportsbookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const challenge = await db.query.challenges.findFirst({ where: eq(challenges.id, id) });
  if (!challenge) notFound();

  const [currentEvents, imports] = await Promise.all([
    db.query.events.findMany({
      where: eq(events.challengeId, id),
      orderBy: (e, { asc }) => asc(e.startsAt),
      limit: 20,
      with: { markets: true },
    }),
    db.query.oddsImports.findMany({
      where: eq(oddsImports.challengeId, id),
      orderBy: desc(oddsImports.ranAt),
      limit: 10,
    }),
  ]);

  const hasPendingPreview = imports.some((i) => i.status === "preview");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight">Sportsbook — {challenge.name}</h1>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline" className="h-11">
            <Link href={`/admin/challenges/${id}/sportsbook/settle`}>Settlement-queue</Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="h-11">
            <Link href={`/admin/challenges/${id}/sportsbook/custom/new`}>Custom event</Link>
          </Button>
          <form action={runOddsImportPreview.bind(null, id)}>
            <Button type="submit" size="sm" className="h-11" disabled={challenge.sportKeys.length === 0}>
              Week importeren
            </Button>
          </form>
        </div>
      </div>
      {challenge.sportKeys.length === 0 && (
        <p className="text-sm text-loss">
          Selecteer eerst sporten bij de{" "}
          <Link href={`/admin/challenges/${id}`} className="underline underline-offset-2">
            challenge-instellingen
          </Link>{" "}
          voor je kunt importeren.
        </p>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Import-geschiedenis</h2>
        {imports.length === 0 && (
          <p className="text-sm text-muted-foreground">Nog geen imports uitgevoerd.</p>
        )}
        <div className="space-y-2">
          {imports.map((imp) => (
            <Link key={imp.id} href={`/admin/challenges/${id}/sportsbook/imports/${imp.id}`}>
              <Card>
                <CardHeader className="gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm tabular-nums">
                      {dateTimeFormatter.format(imp.ranAt)}
                    </CardTitle>
                    <Badge variant="secondary">{IMPORT_STATUS_LABEL[imp.status]}</Badge>
                  </div>
                  <CardDescription className="tabular-nums">
                    {imp.eventsCount} events
                    {imp.creditsUsed !== null && ` · ${imp.creditsUsed} credits gebruikt`}
                    {imp.creditsRemaining !== null && ` · ${imp.creditsRemaining} credits resterend`}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Live events ({currentEvents.length})
        </h2>
        <div className="space-y-2">
          {currentEvents.map((event) => (
            <Card key={event.id}>
              <CardHeader className="gap-1">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm">{event.name}</CardTitle>
                  <Badge variant="secondary">{event.status}</Badge>
                </div>
                <CardDescription className="tabular-nums">
                  {event.sportLabel} · {dateTimeFormatter.format(event.startsAt)}
                </CardDescription>
              </CardHeader>
              {(event.status === "upcoming" || event.status === "suspended") && (
                <div className="flex gap-2 px-4 pb-4">
                  {event.status === "upcoming" ? (
                    <form action={suspendEvent.bind(null, event.id, id)}>
                      <Button type="submit" size="sm" variant="outline" className="h-9">
                        Schorsen
                      </Button>
                    </form>
                  ) : (
                    <form action={reopenEvent.bind(null, event.id, id)}>
                      <Button type="submit" size="sm" variant="outline" className="h-9">
                        Heropenen
                      </Button>
                    </form>
                  )}
                  <form action={voidEventAction.bind(null, event.id, id)}>
                    <Button type="submit" size="sm" variant="outline" className="h-9 text-loss">
                      Void (afgelast)
                    </Button>
                  </form>
                </div>
              )}

              {event.status === "upcoming" && event.markets.length > 0 && (
                <div className="space-y-1 border-t border-border/60 px-4 py-3">
                  <p className="text-xs text-muted-foreground">Per markt</p>
                  {event.markets.map((market) => (
                    <div key={market.id} className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs">
                        {market.label}
                        {market.line !== null && ` ${market.line}`}
                        {market.status !== "open" && (
                          <span className="text-muted-foreground"> · {market.status}</span>
                        )}
                      </span>
                      {market.status === "open" ? (
                        <form action={suspendMarket.bind(null, market.id, id)}>
                          <Button type="submit" size="sm" variant="ghost" className="h-8 text-xs">
                            Schorsen
                          </Button>
                        </form>
                      ) : market.status === "suspended" ? (
                        <form action={reopenMarket.bind(null, market.id, id)}>
                          <Button type="submit" size="sm" variant="ghost" className="h-8 text-xs">
                            Heropenen
                          </Button>
                        </form>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      </section>

      {hasPendingPreview && (
        <p className="text-xs text-muted-foreground">
          Er staat een niet-gepubliceerde preview klaar — bekijk de import-geschiedenis hierboven.
        </p>
      )}
    </div>
  );
}
