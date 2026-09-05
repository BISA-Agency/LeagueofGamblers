import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  challengeParticipants,
  dailyMatches,
  events,
  scorePredictions,
} from "@drizzle/schema";

/**
 * The prize for a correct score, as a share of what everyone started with.
 *
 * A fifth of the starting balance is enormous — on €10.000 it is €2.000, more
 * than most players' whole month of profit. That is the point: it has to be
 * worth opening the app for. It is a gift, not a pot, so several correct
 * guesses each get the full amount rather than splitting it.
 */
export const PREDICTION_REWARD_SHARE = 0.2;

/** Highest score either side can be given. Beyond this it stops being a guess. */
export const MAX_GOALS = 7;

/** The Amsterdam calendar day, as the yyyy-mm-dd the table stores. */
export function matchDayFor(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam" }).format(now);
}

export type DailyMatchView = {
  dailyMatchId: string;
  eventId: string;
  name: string;
  homeTeam: string | null;
  awayTeam: string | null;
  competition: string | null;
  sportKey: string;
  startsAt: Date;
  /** False once it has kicked off — guesses close, the card stays. */
  open: boolean;
  reward: number;
  /** This player's guess, if they made one. */
  mine: { homeGoals: number; awayGoals: number; rewardAmount: number | null; settledAt: Date | null } | null;
  playerCount: number;
  /** Set once the match has been settled. */
  finalScore: { home: number; away: number } | null;
  winners: { username: string; homeGoals: number; awayGoals: number }[];
};

/**
 * Today's featured match for a challenge, with everything the card needs.
 *
 * Returns null when the admin hasn't picked one — deliberately, rather than
 * falling back to some fixture nobody chose. A match of the day that nobody
 * selected is just a random game with €2.000 attached to it.
 */
export async function getDailyMatch(
  challengeId: string,
  userId: string,
  startingBalance: number,
  now = new Date()
): Promise<DailyMatchView | null> {
  const daily = await db.query.dailyMatches.findFirst({
    where: and(
      eq(dailyMatches.challengeId, challengeId),
      eq(dailyMatches.matchDay, matchDayFor(now))
    ),
    with: { event: true },
  });
  if (!daily) return null;

  const predictions = await db.query.scorePredictions.findMany({
    where: eq(scorePredictions.dailyMatchId, daily.id),
    with: { user: { columns: { username: true } } },
  });

  const mine = predictions.find((p) => p.userId === userId) ?? null;
  const event = daily.event;

  const result = event.result as { homeScore?: number; awayScore?: number } | null;
  const finalScore =
    event.status === "finished" && typeof result?.homeScore === "number" && typeof result?.awayScore === "number"
      ? { home: result.homeScore, away: result.awayScore }
      : null;

  return {
    dailyMatchId: daily.id,
    eventId: event.id,
    name: event.name,
    homeTeam: event.homeTeam,
    awayTeam: event.awayTeam,
    competition: event.competition,
    sportKey: event.sportKey,
    startsAt: event.startsAt,
    open: event.startsAt > now && event.status === "upcoming",
    reward: Math.round(startingBalance * PREDICTION_REWARD_SHARE * 100) / 100,
    mine: mine
      ? {
          homeGoals: mine.homeGoals,
          awayGoals: mine.awayGoals,
          rewardAmount: mine.rewardAmount,
          settledAt: mine.settledAt,
        }
      : null,
    playerCount: predictions.length,
    finalScore,
    // Only meaningful once settled; before that it is empty.
    winners: predictions
      .filter((p) => p.rewardAmount !== null && p.rewardAmount > 0)
      .map((p) => ({
        username: p.user.username,
        homeGoals: p.homeGoals,
        awayGoals: p.awayGoals,
      })),
  };
}

/**
 * Pays out everyone who called the score, once the match is settled.
 *
 * Called from the results cron right after an event is marked finished.
 * Guarded on settledAt being null, so a second run over the same event cannot
 * pay the same person twice — the same reasoning as the bet settlement lock,
 * and for the same reason: this moves real balance.
 */
export async function settleScorePredictions(
  eventId: string,
  homeScore: number,
  awayScore: number
): Promise<{ paid: number; total: number }> {
  const matches = await db.query.dailyMatches.findMany({
    where: eq(dailyMatches.eventId, eventId),
    with: { challenge: { columns: { startingBalance: true } } },
  });
  if (matches.length === 0) return { paid: 0, total: 0 };

  let paid = 0;
  let total = 0;

  for (const match of matches) {
    const reward =
      Math.round(match.challenge.startingBalance * PREDICTION_REWARD_SHARE * 100) / 100;

    const pending = await db.query.scorePredictions.findMany({
      where: and(
        eq(scorePredictions.dailyMatchId, match.id),
        sql`${scorePredictions.settledAt} is null`
      ),
    });

    for (const prediction of pending) {
      const correct = prediction.homeGoals === homeScore && prediction.awayGoals === awayScore;
      const amount = correct ? reward : 0;

      // Claim the row first: settledAt going from null to a date is the lock.
      const claimed = await db
        .update(scorePredictions)
        .set({ settledAt: new Date(), rewardAmount: amount })
        .where(
          and(eq(scorePredictions.id, prediction.id), sql`${scorePredictions.settledAt} is null`)
        )
        .returning({ id: scorePredictions.id });
      if (claimed.length === 0) continue;

      if (correct) {
        await db
          .update(challengeParticipants)
          .set({ balance: sql`${challengeParticipants.balance} + ${amount}` })
          .where(
            and(
              eq(challengeParticipants.challengeId, match.challengeId),
              eq(challengeParticipants.userId, prediction.userId)
            )
          );
        paid += 1;
        total += amount;
      }
    }
  }

  return { paid, total };
}

/** Fixtures an admin can pick from: today's, not yet started, with two teams. */
export async function pickableMatches(challengeId: string, now = new Date()) {
  const rows = await db.query.events.findMany({
    where: and(eq(events.challengeId, challengeId), eq(events.status, "upcoming")),
    orderBy: (e, { asc }) => asc(e.startsAt),
  });
  const today = matchDayFor(now);
  return rows.filter(
    (e) => e.startsAt > now && e.homeTeam && e.awayTeam && matchDayFor(e.startsAt) === today
  );
}
