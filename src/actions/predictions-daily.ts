"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAuditEvent } from "@/lib/audit";
import { isAdminEmail } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { MAX_GOALS } from "@/lib/predictions/constants";
import { matchDayFor } from "@/lib/predictions/daily";
import { challengeParticipants, dailyMatches, events, scorePredictions } from "@drizzle/schema";
import { createClient } from "@/lib/supabase/server";

export type PredictionState = { error?: string; ok?: boolean };

/**
 * Enters a player's score for the match of the day.
 *
 * One guess each, and the unique constraint is what makes that true — a
 * check-then-insert would let a double tap through. So the insert simply runs
 * and a conflict is read as "you already guessed", which is also the honest
 * message.
 */
export async function submitScorePrediction(
  _prev: PredictionState,
  formData: FormData
): Promise<PredictionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dailyMatchId = String(formData.get("dailyMatchId") ?? "");
  const homeRaw = String(formData.get("homeGoals") ?? "").trim();
  const awayRaw = String(formData.get("awayGoals") ?? "").trim();

  /**
   * Both fields typed, and typed as digits.
   *
   * Checked on the raw text rather than after Number(): an empty box becomes
   * 0, which is a perfectly valid score, so a half-filled form would have gone
   * in as a confident 0–0 that nobody chose.
   */
  if (!/^\d+$/.test(homeRaw) || !/^\d+$/.test(awayRaw)) {
    return { error: "Vul beide vakjes in met een cijfer." };
  }

  const homeGoals = Number(homeRaw);
  const awayGoals = Number(awayRaw);
  if (homeGoals < 0 || awayGoals < 0 || homeGoals > MAX_GOALS || awayGoals > MAX_GOALS) {
    return { error: `Houd het tussen 0 en ${MAX_GOALS}.` };
  }

  const daily = await db.query.dailyMatches.findFirst({
    where: eq(dailyMatches.id, dailyMatchId),
    with: { event: true },
  });
  if (!daily) return { error: "Deze wedstrijd staat niet meer open." };

  // Kick-off closes it, exactly like a bet. Guessing a score while the ball is
  // rolling is not a guess.
  if (daily.event.startsAt <= new Date() || daily.event.status !== "upcoming") {
    return { error: "De wedstrijd is al begonnen." };
  }

  // Only for people actually in the challenge — the prize lands on a balance,
  // so there has to be one.
  const participant = await db.query.challengeParticipants.findFirst({
    where: and(
      eq(challengeParticipants.challengeId, daily.challengeId),
      eq(challengeParticipants.userId, user.id)
    ),
  });
  if (!participant || participant.status !== "active") {
    return { error: "Je doet niet mee aan deze challenge." };
  }

  const inserted = await db
    .insert(scorePredictions)
    .values({ dailyMatchId, userId: user.id, homeGoals, awayGoals })
    .onConflictDoNothing()
    .returning({ id: scorePredictions.id });

  if (inserted.length === 0) return { error: "Je hebt al een score ingevuld." };

  revalidatePath("/app");
  return { ok: true };
}

/** Admin picks the fixture everyone guesses today. One per challenge per day. */
export async function setDailyMatch(challengeId: string, eventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) redirect("/login");

  const event = await db.query.events.findFirst({ where: eq(events.id, eventId) });
  if (!event) throw new Error("Wedstrijd niet gevonden.");

  const matchDay = matchDayFor(event.startsAt);

  /**
   * Re-picking replaces the choice for that day rather than adding a second.
   * Guesses hang off the daily_matches row, so swapping the fixture after
   * people have guessed would strand their answers — the update keeps the same
   * row, which means it also keeps the guesses. Change it before anyone plays,
   * not after.
   */
  await db
    .insert(dailyMatches)
    .values({ challengeId, eventId, matchDay, createdBy: user.id })
    .onConflictDoUpdate({
      target: [dailyMatches.challengeId, dailyMatches.matchDay],
      set: { eventId, createdBy: user.id },
    });

  await logAuditEvent({
    actorId: user.id,
    action: "daily_match.set",
    entityType: "event",
    entityId: eventId,
    after: { challengeId, matchDay, name: event.name },
  });

  revalidatePath("/app");
  revalidatePath(`/admin/challenges/${challengeId}/daily`);
}
