import { and, eq, inArray, sql } from "drizzle-orm";
import { logActivity } from "@/lib/activity/log";
import { db } from "@/lib/db";
import { settleableMarkets } from "@/lib/odds-provider/settleable-markets";
import type { MarketType } from "@/lib/odds-provider/types";
import { runPostSettlementChecks } from "@/lib/settlement/after-settlement";
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
import {
  settleBtts,
  settleCorrectScore,
  settleDoubleChance,
  settleDrawNoBet,
  settleH2h,
  settleSpread,
  settleTeamTotal,
  settleTotals,
  type SettlementOutcome,
} from "./markets";

export type EventResult = { homeScore: number; awayScore: number };

function computeOutcomeResult(
  market: Market,
  outcome: Outcome,
  event: { homeTeam: string | null; awayTeam: string | null; sportKey: string },
  result: EventResult
): SettlementOutcome {
  /**
   * The same guard the importer uses, applied at the other end.
   *
   * Filtering what gets fetched only protects fixtures imported after that
   * rule existed. Rows already in the table — imported before the rule, or
   * under a rule since narrowed — would still be settled here, and for a
   * sport whose score is in different units than its line that means paying
   * out a tennis total quoted in games against a count of sets.
   *
   * Voiding refunds the stake, which is the right answer for a market that
   * should never have been on the board.
   */
  if (settleableMarkets(event.sportKey, [market.type as MarketType]).length === 0) {
    return "void";
  }

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
  if (market.type === "team_totals" && market.line !== null && market.team) {
    // Which side's score the line applies to. An unrecognised team name would
    // otherwise settle against the home score by accident, so it voids.
    if (market.team === event.homeTeam) {
      return settleTeamTotal(outcome.label, market.line, result.homeScore);
    }
    if (market.team === event.awayTeam) {
      return settleTeamTotal(outcome.label, market.line, result.awayScore);
    }
    return "void";
  }
  if (market.type === "btts") {
    return settleBtts(outcome.label, result.homeScore, result.awayScore);
  }
  if (market.type === "double_chance" && event.homeTeam && event.awayTeam) {
    return settleDoubleChance(
      outcome.label,
      event.homeTeam,
      event.awayTeam,
      result.homeScore,
      result.awayScore
    );
  }
  if (market.type === "draw_no_bet" && event.homeTeam && event.awayTeam) {
    return settleDrawNoBet(
      outcome.label,
      event.homeTeam,
      event.awayTeam,
      result.homeScore,
      result.awayScore
    );
  }
  if (market.type === "correct_score") {
    return settleCorrectScore(outcome.label, result.homeScore, result.awayScore);
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
    await checkAndMarkBust(bet.challengeId, bet.userId);
  } else if (activeSelections.some((s) => s.result === "lost" || s.result === "half_lost")) {
    await db.update(bets).set({ status: "lost", settledAt: new Date() }).where(eq(bets.id, betId));
    await logActivity(bet.challengeId, bet.userId, "bet_lost", {
      betId,
      stake: bet.stake,
      selection: activeSelections[0]?.selectionLabel,
    });
    await checkAndMarkBust(bet.challengeId, bet.userId);
  } else {
    const recomputedOdds = activeSelections.reduce((acc, s) => acc * s.odds, 1);
    const payout = Math.round(bet.stake * recomputedOdds * 100) / 100;

    /**
     * The status change is the lock, not the check at the top of this function.
     *
     * That check reads the bet outside this transaction, so two settlement
     * runs — the hourly cron overlapping a manual one, or an admin settling
     * while it fires — could both find it open and both credit the payout.
     * Claiming the row with `status = 'open'` in the WHERE means exactly one
     * of them gets a row back; the loser stops here, leaving the winner to log
     * the activity and send the single notification.
     */
    const claimed = await db.transaction(async (tx) => {
      const rows = await tx
        .update(bets)
        .set({ status: "won", totalOdds: recomputedOdds, potentialPayout: payout, settledAt: new Date() })
        .where(and(eq(bets.id, betId), eq(bets.status, "open")))
        .returning({ id: bets.id });
      if (rows.length === 0) return false;

      await tx
        .update(challengeParticipants)
        .set({ balance: sql`${challengeParticipants.balance} + ${payout}` })
        .where(
          and(
            eq(challengeParticipants.challengeId, bet.challengeId),
            eq(challengeParticipants.userId, bet.userId)
          )
        );
      return true;
    });
    if (!claimed) return;

    await logActivity(bet.challengeId, bet.userId, "bet_won", {
      betId,
      payout,
      odds: recomputedOdds,
      selection: activeSelections[0]?.selectionLabel,
      eventName: bet.selections[0]?.eventName,
    });
  }

  await runPostSettlementChecks(betId);
}

/** Marks a participant bust (§5.2) once their balance hits 0 with no open bets left — they keep betting-blocked from then on. */
export async function checkAndMarkBust(challengeId: string, userId: string) {
  const participant = await db.query.challengeParticipants.findFirst({
    where: and(eq(challengeParticipants.challengeId, challengeId), eq(challengeParticipants.userId, userId)),
  });
  if (!participant || participant.status !== "active" || participant.balance > 0) return;

  const openBetCount = await db.$count(
    bets,
    and(eq(bets.challengeId, challengeId), eq(bets.userId, userId), eq(bets.status, "open"))
  );
  if (openBetCount > 0) return;

  await db
    .update(challengeParticipants)
    .set({ status: "bust" })
    .where(and(eq(challengeParticipants.challengeId, challengeId), eq(challengeParticipants.userId, userId)));
  await logActivity(challengeId, userId, "bust", {});
}

export async function voidAndRefundBet(betId: string) {
  const bet = await db.query.bets.findFirst({ where: eq(bets.id, betId) });
  if (!bet) return;

  await db.transaction(async (tx) => {
    // Claimed the same way a win is: the refund moves real balance, so two
    // runs finding this bet open must not both hand the stake back. Every
    // caller only voids an open bet, so nothing legitimate is turned away.
    const claimed = await tx
      .update(bets)
      .set({ status: "void", settledAt: new Date() })
      .where(and(eq(bets.id, betId), eq(bets.status, "open")))
      .returning({ id: bets.id });
    if (claimed.length === 0) return;

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
