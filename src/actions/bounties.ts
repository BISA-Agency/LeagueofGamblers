"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { MAX_GOALS } from "@/lib/predictions/constants";
import { bountyPredictions, bountyRoundMatches, challengeParticipants } from "@drizzle/schema";
import { createClient } from "@/lib/supabase/server";

export type BountyPredictionState = { error?: string; ok?: boolean };

export async function submitBountyPrediction(
  _prev: BountyPredictionState,
  formData: FormData
): Promise<BountyPredictionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const bountyRoundMatchId = String(formData.get("bountyRoundMatchId") ?? "");
  const homeRaw = String(formData.get("homeGoals") ?? "").trim();
  const awayRaw = String(formData.get("awayGoals") ?? "").trim();

  if (!/^\d+$/.test(homeRaw) || !/^\d+$/.test(awayRaw)) {
    return { error: "Vul beide vakjes in met een cijfer." };
  }

  const homeGoals = Number(homeRaw);
  const awayGoals = Number(awayRaw);
  if (homeGoals < 0 || awayGoals < 0 || homeGoals > MAX_GOALS || awayGoals > MAX_GOALS) {
    return { error: `Houd het tussen 0 en ${MAX_GOALS}.` };
  }

  const match = await db.query.bountyRoundMatches.findFirst({
    where: eq(bountyRoundMatches.id, bountyRoundMatchId),
    with: { event: true, round: true },
  });
  if (!match) return { error: "Deze wedstrijd staat niet meer open." };
  if (match.round.status !== "collecting") {
    return { error: "Deze bounty-ronde is al afgerond." };
  }
  if (match.event.startsAt <= new Date() || match.event.status !== "upcoming") {
    return { error: "De wedstrijd is al begonnen." };
  }

  const participant = await db.query.challengeParticipants.findFirst({
    where: and(
      eq(challengeParticipants.challengeId, match.round.challengeId),
      eq(challengeParticipants.userId, user.id)
    ),
  });
  if (!participant || participant.status !== "active") {
    return { error: "Je doet niet mee aan deze challenge." };
  }

  const inserted = await db
    .insert(bountyPredictions)
    .values({ bountyRoundMatchId, userId: user.id, homeGoals, awayGoals })
    .onConflictDoNothing()
    .returning({ id: bountyPredictions.id });

  if (inserted.length === 0) return { error: "Je hebt deze wedstrijd al voorspeld." };

  revalidatePath("/app");
  return { ok: true };
}
