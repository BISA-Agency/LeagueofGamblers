import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { events } from "@drizzle/schema";
import type {
  MarketType,
  OddsProvider,
  ProviderEvent,
  ProviderEventOdds,
  ProviderResult,
  ProviderSport,
  UsageInfo,
} from "./types";

function toProviderEvent(e: typeof events.$inferSelect): ProviderEvent {
  return {
    externalId: e.id,
    sportKey: e.sportKey,
    sportLabel: e.sportLabel,
    competition: e.competition ?? undefined,
    homeTeam: e.homeTeam ?? undefined,
    awayTeam: e.awayTeam ?? undefined,
    name: e.name,
    startsAt: e.startsAt,
  };
}

// Wraps the admin's own custom events (source = 'admin') behind the same
// OddsProvider interface. There's no external API to sync from — the admin
// creates and settles these directly (§5.3 "admin custom events") — so this
// mostly just echoes what's already in our own events/markets/outcomes
// tables, kept behind the interface for architectural consistency.
export class ManualProvider implements OddsProvider {
  /** Whatever sports the admin already created events for. */
  async listSports(): Promise<ProviderSport[]> {
    const rows = await db.query.events.findMany({
      where: eq(events.source, "admin"),
      columns: { sportKey: true, sportLabel: true },
    });
    const seen = new Map<string, ProviderSport>();
    for (const row of rows) {
      if (!seen.has(row.sportKey)) {
        seen.set(row.sportKey, {
          key: row.sportKey,
          title: row.sportLabel,
          group: "Handmatig",
          active: true,
        });
      }
    }
    return [...seen.values()];
  }

  async listEvents(sportKey: string, from: Date, to: Date): Promise<ProviderEvent[]> {
    const rows = await db.query.events.findMany({
      where: and(
        eq(events.source, "admin"),
        eq(events.sportKey, sportKey),
        gte(events.startsAt, from),
        lte(events.startsAt, to)
      ),
    });
    return rows.map(toProviderEvent);
  }

  async getOdds(
    sportKey: string,
    marketTypes: MarketType[]
  ): Promise<{ events: ProviderEventOdds[] } & UsageInfo> {
    const rows = await db.query.events.findMany({
      where: and(eq(events.source, "admin"), eq(events.sportKey, sportKey)),
      with: { markets: { with: { outcomes: true } } },
    });

    const result: ProviderEventOdds[] = rows.map((e) => ({
      event: toProviderEvent(e),
      markets: e.markets
        .filter((m) => marketTypes.includes(m.type as MarketType) || m.type === "custom")
        .map((m) => ({
          type: m.type as MarketType,
          label: m.label,
          line: m.line ?? undefined,
          outcomes: m.outcomes.map((o) => ({ label: o.label, odds: o.odds })),
        })),
    }));

    return { events: result, creditsUsed: null, creditsRemaining: null };
  }

  async getResults(_sportKey: string, eventExternalIds: string[]): Promise<ProviderResult[]> {
    const rows = await db.query.events.findMany({
      where: and(eq(events.source, "admin"), inArray(events.id, eventExternalIds)),
    });
    return rows.map((e) => ({
      externalId: e.id,
      completed: e.status === "finished" || e.status === "void",
    }));
  }
}
