import { and, eq } from "drizzle-orm";
import { logActivity } from "@/lib/activity/log";
import { db } from "@/lib/db";
import { challenges, events, markets, oddsImports, outcomes } from "@drizzle/schema";
import { getOddsApiProvider } from "./index";
import { ADDITIONAL_MARKETS, FEATURED_MARKETS, type MarketType, type ProviderEventOdds } from "./types";

/** A bit over a week, so the Monday import still covers next Monday's early
 * fixtures and the optional Thursday run overlaps rather than leaves a gap. */
const IMPORT_HORIZON_DAYS = 8;

/**
 * How close to kick-off an event has to be before we buy its extra markets.
 *
 * Featured markets come free with the bulk call — one request per sport, all
 * fixtures. Additional markets cost one request PER EVENT, billed on the
 * markets returned, so pulling them for the full 8-day window would multiply
 * a ~18-credit import into a ~240-credit one. Nobody bets a team total on a
 * fixture eight days out, so the sportsbook fills those in as kick-off nears.
 */
const ADDITIONAL_WINDOW_HOURS = Number(process.env.ADDITIONAL_MARKETS_WINDOW_HOURS ?? 48);

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
  const configured = (challenge.markets.length > 0 ? challenge.markets : ["h2h"]) as MarketType[];
  const featured = configured.filter((m) => FEATURED_MARKETS.includes(m));
  const additional = configured.filter((m) => ADDITIONAL_MARKETS.includes(m));

  const fetched: ProviderEventOdds[] = [];
  let creditsUsed = 0;
  let creditsRemaining: number | null = null;

  // The /odds endpoint happily returns matches that already kicked off, plus
  // fixtures months out. Neither belongs in a weekly sportsbook: a started
  // match can't be bet on (placeSportsbookBet rejects it) so it would just be
  // dead weight in the list, and far-future fixtures get re-imported with
  // fresher odds next week anyway.
  const now = Date.now();
  const horizon = now + IMPORT_HORIZON_DAYS * 86_400_000;

  for (const sportKey of challenge.sportKeys) {
    const result = await provider.getOdds(sportKey, featured.length > 0 ? featured : ["h2h"]);
    fetched.push(
      ...result.events.filter((e) => {
        const startsAt = e.event.startsAt.getTime();
        if (startsAt <= now || startsAt > horizon) return false;
        // Bookmakers pull their markets close to kick-off; an event with no
        // outcomes left would render as a card with nothing to tap.
        return e.markets.some((m) => m.outcomes.length > 0);
      })
    );
    if (result.creditsUsed) creditsUsed += result.creditsUsed;
    if (result.creditsRemaining !== null) creditsRemaining = result.creditsRemaining;
  }

  // Extra markets for the fixtures close enough to kick-off to be worth the
  // credits. One failure must not take the import with it — a missing team
  // total is a smaller problem than no odds at all.
  if (additional.length > 0) {
    const cutoff = now + ADDITIONAL_WINDOW_HOURS * 3_600_000;
    for (const entry of fetched) {
      if (entry.event.startsAt.getTime() > cutoff) continue;
      try {
        const extra = await provider.getEventOdds(
          entry.event.sportKey,
          entry.event.externalId,
          additional
        );
        entry.markets.push(...extra.markets.filter((m) => m.outcomes.length > 0));
        if (extra.creditsUsed) creditsUsed += extra.creditsUsed;
        if (extra.creditsRemaining !== null) creditsRemaining = extra.creditsRemaining;
      } catch (err) {
        console.error(
          `Extra markten ophalen mislukt voor ${entry.event.name}:`,
          err instanceof Error ? err.message : err
        );
      }
    }
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

/**
 * The preview is parked in a jsonb column, so every Date in it comes back as
 * an ISO string. Drizzle's timestamp columns expect real Dates and throw
 * ("value.toISOString is not a function") otherwise, so revive them on the
 * way out.
 */
function revivePayload(payload: ImportPayload): ImportPayload {
  return {
    ...payload,
    events: payload.events.map((entry) => ({
      ...entry,
      event: { ...entry.event, startsAt: new Date(entry.event.startsAt) },
    })),
  };
}

/** Writes a preview import's events/markets/outcomes for real and marks it published. */
export async function publishImportRow(importId: string) {
  const importRow = await db.query.oddsImports.findFirst({ where: eq(oddsImports.id, importId) });
  if (!importRow || importRow.status !== "preview") {
    throw new Error("Deze import kan niet (meer) gepubliceerd worden.");
  }

  const payload = revivePayload(importRow.diff as ImportPayload);

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
          team: market.team,
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

  if (importRow.challengeId) {
    await logActivity(importRow.challengeId, null, "odds_published", {
      eventsCount: payload.events.length,
    });
  }

  return payload;
}
