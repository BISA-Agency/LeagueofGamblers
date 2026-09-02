import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { discardOddsImport, publishOddsImport } from "@/actions/admin/odds-import";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import type { ProviderEventOdds } from "@/lib/odds-provider";
import { revivePayload } from "@/lib/odds-provider/run-import";
import { oddsImports } from "@drizzle/schema";

export const metadata: Metadata = { title: "Import-preview" };

const dateTimeFormatter = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Amsterdam",
});

export default async function ImportPreviewPage({
  params,
}: {
  params: Promise<{ id: string; importId: string }>;
}) {
  const { id, importId } = await params;
  const importRow = await db.query.oddsImports.findFirst({ where: eq(oddsImports.id, importId) });
  if (!importRow || importRow.challengeId !== id) notFound();

  // Straight out of jsonb every date is a string, and formatting one throws
  // "Invalid time value" — so revive before rendering, the same way publishing
  // does before writing.
  const payload = revivePayload(
    importRow.diff as {
      events: ProviderEventOdds[];
      newExternalIds: string[];
      removedExternalIds: string[];
    }
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Import-preview</h1>
        <p className="text-sm text-muted-foreground tabular-nums">
          {payload.events.length} events · {payload.newExternalIds.length} nieuw ·{" "}
          {payload.removedExternalIds.length} vervallen
          {importRow.creditsUsed !== null && ` · ${importRow.creditsUsed} credits gebruikt`}
          {importRow.creditsRemaining !== null &&
            ` · ${importRow.creditsRemaining} credits resterend deze maand`}
        </p>
      </div>

      {importRow.status !== "preview" && (
        <p className="text-sm text-muted-foreground">
          Deze import is al {importRow.status === "published" ? "gepubliceerd" : "verworpen"}.
        </p>
      )}

      <div className="space-y-2">
        {payload.events.map(({ event, markets }) => (
          <Card key={event.externalId}>
            <CardHeader className="gap-1">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm">{event.name}</CardTitle>
                {payload.newExternalIds.includes(event.externalId) && (
                  <span className="text-xs text-profit">nieuw</span>
                )}
              </div>
              <CardDescription className="tabular-nums">
                {event.sportLabel} · {dateTimeFormatter.format(event.startsAt)} · {markets.length}{" "}
                markt{markets.length !== 1 ? "en" : ""}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      {payload.removedExternalIds.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {payload.removedExternalIds.length} eerder geïmporteerde event(s) staan niet meer in de
          nieuwe import (waarschijnlijk al gespeeld of van het schema gehaald).
        </p>
      )}

      {importRow.status === "preview" && (
        <div className="flex gap-3">
          <form action={publishOddsImport.bind(null, importId)}>
            <Button type="submit" className="h-11">
              Publiceren
            </Button>
          </form>
          <form action={discardOddsImport.bind(null, importId)}>
            <Button type="submit" variant="outline" className="h-11">
              Verwerpen
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
