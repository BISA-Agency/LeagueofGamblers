import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { challenges, events, markets, oddsImports, outcomes } from "@drizzle/schema";
import { getOddsApiProvider } from "./index";
import type { MarketType, ProviderEventOdds } from "./types";

export type ImportPayload = {
  events: ProviderEventOdds[];
  newExternalIds: string[];
  removedExternalIds: string[];
};

/** Fetches fresh odds for a challenge's configured sports and stores them as a preview import row (no DB writes to events/markets/outcomes yet). */
export async function createImportPreview(challengeId: string, ranBy: string | null) {
  const challenge = await db.query.challenges.findFirst({ where: eq(challenges.id, challengeId) });
  if (!challenge) throw new Error("Challenge niet gevonden.");
  if (challenge.sportKeys.length === 0) {
    throw new Error("Deze challenge heeft nog geen sporten geselecteerd.");
  }

  const provider = getOddsApiProvider();
  const marketTypes = (challenge.markets.length > 0 ? challenge.markets : ["h2h"]) as MarketType[];

  const fetched: ProviderEventOdds[] = [];
  let creditsUsed = 0;
  let creditsRemaining: number | null = null;

  for (const sportKey of challenge.sportKeys) {
    const result = await provider.getOdds(sportKey, marketTypes);
    fetched.push(...result.events);
    if (result.creditsUsed) creditsUsed += result.creditsUsed;
    if (result.creditsRemaining !== null) creditsRemaining = result.creditsRemaining;
  }

  const previouslyImported = await db.query.events.findMany({
    where: and(eq(events.challengeId, challengeId), eq(events.source, "odds_api")),
  });
  const previousIds = new Set(previouslyImported.map((e) => e.externalId).filter(Boolean));
  const fetchedIds = new Set(fetched.map((e) => e.event.externalId));

  const payload: ImportPayload = {
    events: fetched,
    newExternalIds: fetched
      .filter((e) => !previousIds.has(e.event.externalId))
      .map((e) => e.event.externalId),
    removedExternalIds: previouslyImported
      .filter((e) => e.externalId && !fetchedIds.has(e.externalId))
      .map((e) => e.externalId!),
  };

  const [importRow] = await db
    .insert(oddsImports)
    .values({
      challengeId,
      ranBy,
      creditsUsed,
      creditsRemaining,
      eventsCount: fetched.length,
      status: "preview",
      diff: payload,
    })
    .returning();

  return { importRow, challenge };
}

/** Writes a preview import's events/markets/outcomes for real and marks it published. */
export async function publishImportRow(importId: string) {
  const importRow = await db.query.oddsImports.findFirst({ where: eq(oddsImports.id, importId) });
  if (!importRow || importRow.status !== "preview") {
    throw new Error("Deze import kan niet (meer) gepubliceerd worden.");
  }

  const payload = importRow.diff as ImportPayload;

  for (const { event, markets: providerMarkets } of payload.events) {
    const [eventRow] = await db
      .insert(events)
      .values({
        challengeId: importRow.challengeId,
        source: "odds_api",
        externalId: event.externalId,
        sportKey: event.sportKey,
        sportLabel: event.sportLabel,
        competition: event.competition,
        homeTeam: event.homeTeam,
        awayTeam: event.awayTeam,
        name: event.name,
        startsAt: event.startsAt,
        status: "upcoming",
      })
      .onConflictDoUpdate({
        target: [events.challengeId, events.externalId],
        set: {
          name: event.name,
          startsAt: event.startsAt,
          status: "upcoming",
          homeTeam: event.homeTeam,
          awayTeam: event.awayTeam,
        },
      })
      .returning();

    // Re-imports replace this event's markets/outcomes wholesale — safe
    // because bet_selections denormalizes its own odds/label (see
    // drizzle/schema/bet-selections.ts) and its outcome_id just goes null.
    await db.delete(markets).where(eq(markets.eventId, eventRow.id));

    for (const market of providerMarkets) {
      const [marketRow] = await db
        .insert(markets)
        .values({
          eventId: eventRow.id,
          type: market.type,
          label: market.label,
          line: market.line,
        })
        .returning();

      if (market.outcomes.length > 0) {
        await db.insert(outcomes).values(
          market.outcomes.map((o) => ({
            marketId: marketRow.id,
            label: o.label,
            odds: o.odds,
          }))
        );
      }
    }
  }

  await db.update(oddsImports).set({ status: "published" }).where(eq(oddsImports.id, importId));

  return payload;
}
