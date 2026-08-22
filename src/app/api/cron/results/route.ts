import { and, eq, lte } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { requireCronSecret } from "@/lib/cron-auth";
import { db } from "@/lib/db";
import { getOddsApiProvider } from "@/lib/odds-provider";
import { settleMarketFromScore } from "@/lib/settlement/execute";
import { events } from "@drizzle/schema";

/** Daily results fetch + auto-settlement (§5.3) for odds_api-sourced events. */
export async function GET(request: NextRequest) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  const pendingEvents = await db.query.events.findMany({
    where: and(
      eq(events.source, "odds_api"),
      eq(events.status, "upcoming"),
      lte(events.startsAt, new Date())
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
