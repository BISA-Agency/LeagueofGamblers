"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { RateLimitError, assertBetRateLimit } from "@/lib/rate-limit";
import { bets, betSelections, challengeParticipants, events, markets, outcomes } from "@drizzle/schema";
import { createClient } from "@/lib/supabase/server";

export type PlaceBetState = { error?: string; success?: boolean };

const BUSTED_STATUSES = new Set(["bust", "kicked", "disqualified"]);

export async function placeSportsbookBet(
  challengeId: string,
  outcomeIds: string[],
  stakeInput: number
): Promise<PlaceBetState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (outcomeIds.length === 0) return { error: "Kies minstens één selectie." };
  if (!Number.isFinite(stakeInput) || stakeInput <= 0) {
    return { error: "Vul een geldige inzet in." };
  }

  const uniqueOutcomeIds = Array.from(new Set(outcomeIds));

  // Fetch fresh odds/market/event state server-side — the client's copy of
  // the odds is never trusted, only used to render the slip.
  const rows = await db
    .select({
      outcomeId: outcomes.id,
      odds: outcomes.odds,
      label: outcomes.label,
      marketLabel: markets.label,
      marketStatus: markets.status,
      eventId: events.id,
      eventName: events.name,
      eventStartsAt: events.startsAt,
      eventStatus: events.status,
      sportLabel: events.sportLabel,
      competition: events.competition,
    })
    .from(outcomes)
    .innerJoin(markets, eq(markets.id, outcomes.marketId))
    .innerJoin(events, eq(events.id, markets.eventId))
    .where(inArray(outcomes.id, uniqueOutcomeIds));

  if (rows.length !== uniqueOutcomeIds.length) {
    return { error: "Eén of meer selecties bestaan niet meer." };
  }

  const now = new Date();
  const seenEventIds = new Set<string>();
  for (const row of rows) {
    if (row.eventStartsAt <= now || row.eventStatus !== "upcoming") {
      return { error: `${row.eventName} is al begonnen — deze selectie kan niet meer.` };
    }
    if (row.marketStatus !== "open") {
      return { error: `De markt voor ${row.eventName} is geschorst of gesloten.` };
    }
    if (seenEventIds.has(row.eventId)) {
      return { error: "Je kunt geen twee selecties uit dezelfde wedstrijd combineren." };
    }
    seenEventIds.add(row.eventId);
  }

  const totalOdds = rows.reduce((acc, r) => acc * r.odds, 1);
  const stake = Math.round(stakeInput * 100) / 100;
  const potentialPayout = Math.round(stake * totalOdds * 100) / 100;
  const earliestStart = rows.reduce(
    (min, r) => (r.eventStartsAt < min ? r.eventStartsAt : min),
    rows[0].eventStartsAt
  );

  try {
    await assertBetRateLimit(user.id);
  } catch (err) {
    if (err instanceof RateLimitError) return { error: err.message };
    throw err;
  }

  try {
    await db.transaction(async (tx) => {
      const participant = await tx.query.challengeParticipants.findFirst({
        where: and(
          eq(challengeParticipants.challengeId, challengeId),
          eq(challengeParticipants.userId, user.id)
        ),
      });
      if (!participant) throw new Error("Je doet niet mee aan deze challenge.");
      if (BUSTED_STATUSES.has(participant.status)) {
        throw new Error("Je kunt geen bets meer plaatsen.");
      }
      if (stake > participant.balance) {
        throw new Error("Je inzet is hoger dan je saldo.");
      }

      const [bet] = await tx
        .insert(bets)
        .values({
          challengeId,
          userId: user.id,
          kind: "sportsbook",
          type: rows.length > 1 ? "combi" : "single",
          stake,
          wasAllIn: stake === participant.balance,
          totalOdds,
          potentialPayout,
          eventStart: earliestStart,
        })
        .returning();

      await tx.insert(betSelections).values(
        rows.map((r) => ({
          betId: bet.id,
          outcomeId: r.outcomeId,
          eventName: r.eventName,
          eventStart: r.eventStartsAt,
          sport: r.sportLabel,
          competition: r.competition,
          marketLabel: r.marketLabel,
          selectionLabel: r.label,
          odds: r.odds,
        }))
      );

      await tx
        .update(challengeParticipants)
        .set({ balance: sql`${challengeParticipants.balance} - ${stake}` })
        .where(
          and(
            eq(challengeParticipants.challengeId, challengeId),
            eq(challengeParticipants.userId, user.id)
          )
        );
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Plaatsen mislukt. Probeer het opnieuw." };
  }

  revalidatePath("/app/sportsbook");
  revalidatePath("/app/bets");
  revalidatePath("/app");
  return { success: true };
}
