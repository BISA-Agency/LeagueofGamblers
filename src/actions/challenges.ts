"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getUserEmail, sendEmail } from "@/lib/email/send";
import { pendingPaymentEmail } from "@/lib/email/templates";
import { totalWithFee } from "@/lib/payments/rate";
import { getSiteUrl } from "@/lib/site-url";
import { challengeParticipants, challenges, profiles } from "@drizzle/schema";
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

  const inserted = await db
    .insert(challengeParticipants)
    .values({ challengeId, userId: user.id })
    .onConflictDoNothing()
    .returning({ userId: challengeParticipants.userId });

  // Only on an actual new join — onConflictDoNothing means a second click
  // (already a participant) returns nothing here, and must not re-mail them.
  if (inserted.length > 0) {
    try {
      const [profile, email] = await Promise.all([
        db.query.profiles.findFirst({ where: eq(profiles.id, user.id), columns: { username: true } }),
        getUserEmail(user.id),
      ]);
      if (email) {
        const { fee } = totalWithFee(challenge.buyInAmount, challenge.platformFeePercent);
        const mail = pendingPaymentEmail({
          username: profile?.username ?? "speler",
          challengeName: challenge.name,
          buyInAmount: challenge.buyInAmount,
          feeAmount: fee,
          payUrl: `${getSiteUrl()}/app/pay/${challengeId}`,
        });
        await sendEmail({ to: email, ...mail });
      }
    } catch (err) {
      console.error("[email] welkomstmail bij joinen mislukt:", err instanceof Error ? err.message : err);
    }
  }

  revalidatePath("/app/challenges");
  revalidatePath("/app");
  redirect("/app/challenges");
}
