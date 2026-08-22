import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { evaluateMissionsForSettledBet } from "@/lib/missions/engine";
import {
  betSelections,
  bets,
  challengeParticipants,
  events,
  markets,
  outcomes,
  type Market,
  type Outcome,
} from "@drizzle/schema";
import { settleH2h, settleSpread, settleTotals, type SettlementOutcome } from "./markets";

export type EventResult = { homeScore: number; awayScore: number };

function computeOutcomeResult(
  market: Market,
  outcome: Outcome,
  event: { homeTeam: string | null; awayTeam: string | null },
  result: EventResult
): SettlementOutcome {
  if (market.type === "h2h" && event.homeTeam && event.awayTeam) {
    return settleH2h(outcome.label, event.homeTeam, event.awayTeam, result.homeScore, result.awayScore);
  }
  if (market.type === "totals" && market.line !== null) {
    return settleTotals(outcome.label, market.line, result.homeScore + result.awayScore);
  }
  if (market.type === "spreads" && market.line !== null && event.homeTeam && event.awayTeam) {
    return settleSpread(
      outcome.label,
      market.line,
      event.homeTeam,
      event.awayTeam,
      result.homeScore,
      result.awayScore
    );
  }
  // "custom" markets (admin events) can't be auto-settled from a score.
  return "void";
}

/** Auto-settles one market from a final score. Custom/admin markets go through settleMarketManually instead. */
export async function settleMarketFromScore(marketId: string, result: EventResult) {
  const market = await db.query.markets.findFirst({
    where: eq(markets.id, marketId),
    with: { outcomes: true, event: true },
  });
  if (!market) return;

  for (const outcome of market.outcomes) {
    const outcomeResult = computeOutcomeResult(market, outcome, market.event, result);
    await applyOutcomeResult(outcome.id, outcomeResult);
  }

  await db.update(markets).set({ status: "settled" }).where(eq(markets.id, marketId));
  await finalizeAffectedBets(market.outcomes.map((o) => o.id));
}

/** Admin manually settles a market outcome-by-outcome (custom events, or overrides). */
export async function settleMarketManually(
  marketId: string,
  outcomeResults: { outcomeId: string; result: SettlementOutcome }[]
) {
  for (const { outcomeId, result } of outcomeResults) {
    await applyOutcomeResult(outcomeId, result);
  }
  await db.update(markets).set({ status: "settled" }).where(eq(markets.id, marketId));
  await finalizeAffectedBets(outcomeResults.map((o) => o.outcomeId));
}

async function applyOutcomeResult(outcomeId: string, result: SettlementOutcome) {
  await db.update(outcomes).set({ result }).where(eq(outcomes.id, outcomeId));
  await db.update(betSelections).set({ result }).where(eq(betSelections.outcomeId, outcomeId));
}

async function finalizeAffectedBets(outcomeIds: string[]) {
  if (outcomeIds.length === 0) return;
  const affected = await db.query.betSelections.findMany({
    where: inArray(betSelections.outcomeId, outcomeIds),
  });
  const betIds = [...new Set(affected.map((s) => s.betId))];
  for (const betId of betIds) {
    await finalizeBetIfComplete(betId);
  }
}

/**
 * Once every selection on a bet has a result, settles the bet as a whole:
 * void selections are dropped and the odds/payout recomputed from what's
 * left (§5.3 "combi's worden herberekend zonder die selectie"); any
 * remaining lost leg loses the whole bet; otherwise it's a win. Simplifying
 * assumption: half_won/half_lost legs inside a combi count as a full
 * win/loss at the leg's original odds — real split-stake Asian-handicap
 * combi payouts are out of scope for this MVP.
 */
export async function finalizeBetIfComplete(betId: string) {
  const bet = await db.query.bets.findFirst({
    where: eq(bets.id, betId),
    with: { selections: true },
  });
  if (!bet || bet.status !== "open") return;
  if (!bet.selections.every((s) => s.result !== null)) return;

  const activeSelections = bet.selections.filter((s) => s.result !== "void");

  if (activeSelections.length === 0) {
    await voidAndRefundBet(betId);
  } else if (activeSelections.some((s) => s.result === "lost" || s.result === "half_lost")) {
    await db.update(bets).set({ status: "lost", settledAt: new Date() }).where(eq(bets.id, betId));
  } else {
    const recomputedOdds = activeSelections.reduce((acc, s) => acc * s.odds, 1);
    const payout = Math.round(bet.stake * recomputedOdds * 100) / 100;

    await db.transaction(async (tx) => {
      await tx
        .update(bets)
        .set({ status: "won", totalOdds: recomputedOdds, potentialPayout: payout, settledAt: new Date() })
        .where(eq(bets.id, betId));
      await tx
        .update(challengeParticipants)
        .set({ balance: sql`${challengeParticipants.balance} + ${payout}` })
        .where(
          and(
            eq(challengeParticipants.challengeId, bet.challengeId),
            eq(challengeParticipants.userId, bet.userId)
          )
        );
    });
  }

  await evaluateMissionsForSettledBet(betId);
}

export async function voidAndRefundBet(betId: string) {
  const bet = await db.query.bets.findFirst({ where: eq(bets.id, betId) });
  if (!bet) return;

  await db.transaction(async (tx) => {
    await tx.update(bets).set({ status: "void", settledAt: new Date() }).where(eq(bets.id, betId));
    await tx
      .update(challengeParticipants)
      .set({ balance: sql`${challengeParticipants.balance} + ${bet.stake}` })
      .where(
        and(
          eq(challengeParticipants.challengeId, bet.challengeId),
          eq(challengeParticipants.userId, bet.userId)
        )
      );
  });
}

/** Void an entire event (afgelast/verplaatst) — every open selection on it voids, refunding or recomputing each affected bet. */
export async function voidEvent(eventId: string) {
  const eventMarkets = await db.query.markets.findMany({
    where: eq(markets.eventId, eventId),
    with: { outcomes: true },
  });

  for (const market of eventMarkets) {
    for (const outcome of market.outcomes) {
      await applyOutcomeResult(outcome.id, "void");
    }
    await db.update(markets).set({ status: "void" }).where(eq(markets.id, market.id));
  }

  await db
    .update(events)
    .set({ status: "void", settledAt: new Date() })
    .where(eq(events.id, eventId));

  await finalizeAffectedBets(eventMarkets.flatMap((m) => m.outcomes.map((o) => o.id)));
}
