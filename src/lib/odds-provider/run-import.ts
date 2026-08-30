import { and, count, eq } from "drizzle-orm";
import { logActivity } from "@/lib/activity/log";
import { db } from "@/lib/db";
import {
  betSelections,
  challenges,
  events,
  markets,
  oddsImports,
  outcomes,
} from "@drizzle/schema";
import { getOddsApiProvider } from "./index";
import { settleableMarkets } from "./settleable-markets";
import { ADDITIONAL_MARKETS, FEATURED_MARKETS, type MarketType, type ProviderEventOdds } from "./types";

/** A bit over a week, so the Monday import still covers next Monday's early
 * fixtures and the optional Thursday run overlaps rather than leaves a gap. */
const IMPORT_HORIZON_DAYS = 8;

/**
 * How close to kick-off an event has to be before we buy its extra markets.
 *
 * Featured markets come free with the bulk call — one request per sport, all
 * fixtures. Additional markets cost one request PER EVENT, billed on the
 * markets returned, which is why this used to sit at 48 hours: it kept a
 * weekly import near 18 credits instead of a few hundred.
 *
 * That thrift had a cost nobody could see from the outside. The import runs
 * Monday, so a Saturday fixture was five days out and never qualified — of 98
 * imported events, six carried both-teams-to-score and two carried a team
 * total. The markets were configured and simply never fetched.
 *
 * Defaulting to the whole import horizon fixes that: every fixture in the
 * sportsbook now gets every market the challenge asks for. Set
 * ADDITIONAL_MARKETS_WINDOW_HOURS to something smaller to go back to
 * rationing credits.
 */
const ADDITIONAL_WINDOW_HOURS = Number(
  process.env.ADDITIONAL_MARKETS_WINDOW_HOURS ?? IMPORT_HORIZON_DAYS * 24
);

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
  /**
   * Never past the challenge's own finish line.
   *
   * The eight-day window runs on regardless of when the month ends, so the
   * last import of September would have offered fixtures in October. A bet on
   * one of those is still open when the challenge closes, and finishChallenge
   * refuses to pay out while anything is unsettled — so the prize money would
   * have waited on a match played days after the standings were supposed to
   * be final, with the ranking still able to move.
   */
  const horizon = Math.min(
    now + IMPORT_HORIZON_DAYS * 86_400_000,
    challenge.endAt.getTime()
  );

  for (const sportKey of challenge.sportKeys) {
    // A challenge picks its markets once, for every sport it runs. Tennis
    // quotes a total in games and a handicap in sets, so importing those
    // alongside football's would hand players bets that settle against the
    // wrong unit — see settleable-markets.ts.
    const forSport = settleableMarkets(sportKey, featured);
    const result = await provider.getOdds(sportKey, forSport.length > 0 ? forSport : ["h2h"]);
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
      // Same guard, and it also saves the call entirely for a fight card,
      // where none of these markets exist to begin with.
      const forSport = settleableMarkets(entry.event.sportKey, additional);
      if (forSport.length === 0) continue;
      try {
        const extra = await provider.getEventOdds(
          entry.event.sportKey,
          entry.event.externalId,
          forSport
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

    /**
     * Re-imports replace an event's markets wholesale — but only while nobody
     * has bet on it.
     *
     * bet_selections keeps its own copy of the odds and labels, so a bet slip
     * still *reads* correctly after its outcome row is deleted. Settlement,
     * though, finds selections solely by outcome_id (see
     * settlement/execute.ts), and the foreign key nulls that on delete. A bet
     * whose event got re-imported would therefore never be settled by any
     * automatic path, would sit open for ever, and finishChallenge refuses to
     * pay out a challenge with open bets — so one routine re-import could
     * hold up the whole month's prize money.
     *
     * Keeping the existing board costs this fixture its odds refresh, which
     * is the smaller problem by a wide margin: the players who already bet
     * have their price locked in anyway, and a stale quote merely ages.
     */
    const [{ n: placedOnThisEvent }] = await db
      .select({ n: count() })
      .from(betSelections)
      .innerJoin(outcomes, eq(outcomes.id, betSelections.outcomeId))
      .innerJoin(markets, eq(markets.id, outcomes.marketId))
      .where(eq(markets.eventId, eventRow.id));

    if (placedOnThisEvent > 0) continue;

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
