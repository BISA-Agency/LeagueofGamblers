"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAuditEvent } from "@/lib/audit";
import { isAdminEmail } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getOddsApiProvider, type MarketType, type ProviderEventOdds } from "@/lib/odds-provider";
import { createClient } from "@/lib/supabase/server";
import { challenges, events, markets, oddsImports, outcomes } from "@drizzle/schema";

type ImportPayload = {
  events: ProviderEventOdds[];
  newExternalIds: string[];
  removedExternalIds: string[];
};

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) redirect("/login");
  return user;
}

export async function runOddsImportPreview(challengeId: string) {
  const admin = await requireAdmin();

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
    where: (e, { and: andOp, eq: eqOp }) =>
      andOp(eqOp(e.challengeId, challengeId), eqOp(e.source, "odds_api")),
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
      ranBy: admin.id,
      creditsUsed,
      creditsRemaining,
      eventsCount: fetched.length,
      status: "preview",
      diff: payload,
    })
    .returning();

  revalidatePath(`/admin/challenges/${challengeId}/sportsbook`);
  redirect(`/admin/challenges/${challengeId}/sportsbook/imports/${importRow.id}`);
}

export async function publishOddsImport(importId: string) {
  const admin = await requireAdmin();

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

  await logAuditEvent({
    actorId: admin.id,
    action: "odds_import.publish",
    entityType: "odds_import",
    entityId: importId,
    after: { eventsCount: payload.events.length },
  });

  revalidatePath(`/admin/challenges/${importRow.challengeId}/sportsbook`);
  revalidatePath("/app/sportsbook");
  redirect(`/admin/challenges/${importRow.challengeId}/sportsbook`);
}

export async function discardOddsImport(importId: string) {
  await requireAdmin();
  const importRow = await db.query.oddsImports.findFirst({ where: eq(oddsImports.id, importId) });
  if (!importRow || importRow.status !== "preview") return;

  await db.update(oddsImports).set({ status: "discarded" }).where(eq(oddsImports.id, importId));
  revalidatePath(`/admin/challenges/${importRow.challengeId}/sportsbook`);
  redirect(`/admin/challenges/${importRow.challengeId}/sportsbook`);
}
