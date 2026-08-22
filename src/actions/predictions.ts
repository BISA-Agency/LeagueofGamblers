"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { challengeParticipants, challenges, predictions } from "@drizzle/schema";
import { createClient } from "@/lib/supabase/server";

export async function savePrediction(challengeId: string, predictedWinnerId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const challenge = await db.query.challenges.findFirst({ where: eq(challenges.id, challengeId) });
  if (!challenge) throw new Error("Challenge niet gevonden.");
  // Predictions close the moment the challenge starts — otherwise you could
  // wait until the field has separated and call it a prediction.
  if (challenge.status !== "open") throw new Error("Voorspellingen zijn gesloten.");

  const [me, target] = await Promise.all([
    db.query.challengeParticipants.findFirst({
      where: and(
        eq(challengeParticipants.challengeId, challengeId),
        eq(challengeParticipants.userId, user.id)
      ),
    }),
    db.query.challengeParticipants.findFirst({
      where: and(
        eq(challengeParticipants.challengeId, challengeId),
        eq(challengeParticipants.userId, predictedWinnerId)
      ),
    }),
  ]);
  if (!me) throw new Error("Je doet niet mee aan deze challenge.");
  if (!target) throw new Error("Die speler doet niet mee aan deze challenge.");

  await db
    .insert(predictions)
    .values({ challengeId, userId: user.id, predictedWinnerId })
    .onConflictDoUpdate({
      target: [predictions.challengeId, predictions.userId],
      set: { predictedWinnerId },
    });

  revalidatePath(`/app/challenge/${challenge.slug}`);
}
