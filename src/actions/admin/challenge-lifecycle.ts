"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAuditEvent } from "@/lib/audit";
import { isAdminEmail } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { FinishChallengeError, finishChallenge } from "@/lib/challenges/finish";
import { challengeParticipants, challenges } from "@drizzle/schema";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) redirect("/login");
  return user;
}

export async function toggleParticipantPaid(challengeId: string, userId: string, paid: boolean) {
  const admin = await requireAdmin();

  await db
    .update(challengeParticipants)
    .set({ paidBuyIn: paid, paidAt: paid ? new Date() : null })
    .where(
      and(
        eq(challengeParticipants.challengeId, challengeId),
        eq(challengeParticipants.userId, userId)
      )
    );

  await logAuditEvent({
    actorId: admin.id,
    action: "participant.toggle_paid",
    entityType: "challenge_participant",
    entityId: `${challengeId}:${userId}`,
    after: { paidBuyIn: paid },
  });

  revalidatePath(`/admin/challenges/${challengeId}/players`);
}

/**
 * Manual override for the draft->open->live->settling->finished lifecycle
 * (§5.2 — Vercel Cron does this automatically on schedule; not built yet,
 * this is the admin's manual trigger for the same transition).
 */
export async function transitionChallengeToLive(challengeId: string) {
  const admin = await requireAdmin();

  const challenge = await db.query.challenges.findFirst({ where: eq(challenges.id, challengeId) });
  if (!challenge || challenge.status !== "open") {
    throw new Error("Alleen een open challenge kan live gezet worden.");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(challengeParticipants)
      .set({ status: "active", balance: challenge.startingBalance })
      .where(
        and(
          eq(challengeParticipants.challengeId, challengeId),
          eq(challengeParticipants.paidBuyIn, true),
          eq(challengeParticipants.status, "joined")
        )
      );

    await tx
      .update(challenges)
      .set({ status: "live", updatedAt: new Date() })
      .where(eq(challenges.id, challengeId));
  });

  await logAuditEvent({
    actorId: admin.id,
    action: "challenge.transition_live",
    entityType: "challenge",
    entityId: challengeId,
  });

  revalidatePath("/admin/challenges");
  revalidatePath(`/admin/challenges/${challengeId}`);
  revalidatePath("/app/challenges");
}

export type FinishChallengeState = { error?: string; ok?: string };

/**
 * settling -> finished. Writes the prize payout records, so it stays a
 * deliberate admin action rather than something a cron does at midnight.
 */
export async function finishChallengeAction(
  challengeId: string,
  _prevState: FinishChallengeState,
  _formData: FormData
): Promise<FinishChallengeState> {
  const admin = await requireAdmin();

  try {
    const result = await finishChallenge(challengeId, admin.id);
    revalidatePath("/admin/challenges");
    revalidatePath(`/admin/challenges/${challengeId}`);
    revalidatePath("/admin/payments");
    return {
      ok: `Afgesloten. Pot €${result.pot.toLocaleString("nl-NL")}, ${result.payouts} uitbetaling(en) klaargezet.`,
    };
  } catch (err) {
    if (err instanceof FinishChallengeError) return { error: err.message };
    throw err;
  }
}
