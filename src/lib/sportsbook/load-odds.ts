import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { markets, outcomes, type Market, type Outcome } from "@drizzle/schema";
import { pickPrimaryMarket } from "./primary-market";

export type MarketWithOutcomes = Market & { outcomes: Outcome[] };

/**
 * The odds a fixture list actually shows, and nothing more.
 *
 * A card displays one market — three prices — and a count of the rest. The
 * page used to load every market with every price for every fixture: 5.946
 * rows to render 486, all of them serialised, sent to the server's renderer
 * and dropped. It was the larger half of a two-second wait.
 *
 * So this fetches in two steps. Markets first, without prices, because
 * choosing which market leads the card needs their types and counting the
 * rest needs their number. Then the prices for the chosen market only.
 *
 * Markets that are not the primary one come back with an empty outcomes
 * array. That is not a lie the card can trip over — it never reads them, it
 * only counts them.
 */
export async function loadListOdds(
  eventIds: string[]
): Promise<Map<string, MarketWithOutcomes[]>> {
  const byEvent = new Map<string, MarketWithOutcomes[]>();
  if (eventIds.length === 0) return byEvent;

  const marketRows = await db.query.markets.findMany({
    where: inArray(markets.eventId, eventIds),
  });

  const openMarkets = marketRows.filter((m) => m.status === "open");
  for (const market of openMarkets) {
    byEvent.set(market.eventId, [...(byEvent.get(market.eventId) ?? []), { ...market, outcomes: [] }]);
  }

  // One market per event carries prices: the one the card leads with.
  const primaryIds = [...byEvent.values()]
    .map((list) => pickPrimaryMarket(list)?.id)
    .filter((id): id is string => Boolean(id));
  if (primaryIds.length === 0) return byEvent;

  const priceRows = await db.query.outcomes.findMany({
    where: inArray(outcomes.marketId, primaryIds),
  });

  const pricesByMarket = new Map<string, Outcome[]>();
  for (const price of priceRows) {
    pricesByMarket.set(price.marketId, [...(pricesByMarket.get(price.marketId) ?? []), price]);
  }
  for (const list of byEvent.values()) {
    for (const market of list) {
      market.outcomes = pricesByMarket.get(market.id) ?? [];
    }
  }

  return byEvent;
}

/** Every market and price for one fixture — the detail page needs the lot. */
export async function loadEventOdds(eventId: string): Promise<MarketWithOutcomes[]> {
  return db.query.markets.findMany({
    where: eq(markets.eventId, eventId),
    with: { outcomes: true },
  });
}
