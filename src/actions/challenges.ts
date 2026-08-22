"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { challengeParticipants, challenges } from "@drizzle/schema";
import { createClient } from "@/lib/supabase/server";

export type JoinChallengeState = { error?: string };

export async function joinChallenge(
  _prevState: JoinChallengeState,
  formData: FormData
): Promise<JoinChallengeState> {
  const challengeId = String(formData.get("challengeId") ?? "");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const challenge = await db.query.challenges.findFirst({
    where: eq(challenges.id, challengeId),
  });
  if (!challenge || challenge.status !== "open") {
    return { error: "Deze challenge is niet (meer) open voor inschrijving." };
  }

  if (challenge.maxPlayers) {
    const count = await db.$count(
      challengeParticipants,
      eq(challengeParticipants.challengeId, challengeId)
    );
    if (count >= challenge.maxPlayers) {
      return { error: "Deze challenge zit vol." };
    }
  }

  await db
    .insert(challengeParticipants)
    .values({ challengeId, userId: user.id })
    .onConflictDoNothing();

  revalidatePath("/app/challenges");
  revalidatePath("/app");
  redirect("/app/challenges");
}
