import { and, eq, gte, lte } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { requireCronSecret } from "@/lib/cron-auth";
import { db } from "@/lib/db";
import { getOddsApiProvider } from "@/lib/odds-provider";
import { settleMarketFromScore } from "@/lib/settlement/execute";
import { events } from "@drizzle/schema";

/**
 * How long after kick-off an event could plausibly be over. Nothing is asked
 * of the API before this: a request during play costs the same two credits as
 * one after the whistle and can never return a result.
 *
 * Set for football with extra time and a delay; the slowest sports settle a
 * run or two later, which costs nothing but a few minutes.
 */
const SETTLE_AFTER_MINUTES = 130;

/**
 * And when to stop asking. The scores endpoint only looks three days back, so
 * an event still unsettled after that is never going to resolve here —
 * abandoned, postponed, or renamed upstream. Without this bound it would be
 * re-queried on every single run, for ever.
 */
const GIVE_UP_AFTER_DAYS = 3;

/**
 * Hourly results fetch + auto-settlement (§5.3) for odds_api-sourced events.
 *
 * Costs two usage credits per sport per run, and only when something is
 * actually inside the window above — with an empty queue this never reaches
 * the network at all.
 */
export async function GET(request: NextRequest) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  const now = Date.now();
  const ripeBy = new Date(now - SETTLE_AFTER_MINUTES * 60_000);
  const tooOld = new Date(now - GIVE_UP_AFTER_DAYS * 24 * 60 * 60_000);

  const pendingEvents = await db.query.events.findMany({
    where: and(
      eq(events.source, "odds_api"),
      eq(events.status, "upcoming"),
      lte(events.startsAt, ripeBy),
      gte(events.startsAt, tooOld)
    ),
    with: { markets: true },
  });

  if (pendingEvents.length === 0) {
    return NextResponse.json({ settled: [] });
  }

  const provider = getOddsApiProvider();
  const bySport = new Map<string, typeof pendingEvents>();
  for (const event of pendingEvents) {
    const list = bySport.get(event.sportKey) ?? [];
    list.push(event);
    bySport.set(event.sportKey, list);
  }

  const settled: string[] = [];

  for (const [sportKey, sportEvents] of bySport) {
    const results = await provider.getResults(
      sportKey,
      sportEvents.map((e) => e.externalId).filter((id): id is string => !!id)
    );

    for (const result of results) {
      if (!result.completed || !result.scores || result.scores.length < 2) continue;
      const event = sportEvents.find((e) => e.externalId === result.externalId);
      if (!event) continue;

      const homeScore = result.scores.find((s) => s.name === event.homeTeam)?.score;
      const awayScore = result.scores.find((s) => s.name === event.awayTeam)?.score;
      if (homeScore === undefined || awayScore === undefined) continue;

      for (const market of event.markets) {
        await settleMarketFromScore(market.id, { homeScore, awayScore });
      }
      await db.update(events).set({ status: "finished", settledAt: new Date() }).where(eq(events.id, event.id));
      settled.push(event.id);
    }
  }

  return NextResponse.json({ settled });
}
