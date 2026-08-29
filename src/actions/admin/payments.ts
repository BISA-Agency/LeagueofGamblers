"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAuditEvent } from "@/lib/audit";
import { isAdminEmail } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getUserEmail, sendEmail } from "@/lib/email/send";
import { challengeWelcomeEmail } from "@/lib/email/templates";
import { evaluateReferralMissions } from "@/lib/referrals/evaluate";
import { getSiteUrl } from "@/lib/site-url";
import { getProofScreenshotSignedUrl } from "@/lib/storage/screenshots";
import { challengeParticipants, challenges, profiles, payments } from "@drizzle/schema";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) redirect("/login");
  return user;
}

export async function confirmPayment(paymentId: string) {
  const admin = await requireAdmin();

  await db
    .update(payments)
    .set({ status: "confirmed", confirmedBy: admin.id, confirmedAt: new Date() })
    .where(eq(payments.id, paymentId));

  await logAuditEvent({
    actorId: admin.id,
    action: "payment.confirm",
    entityType: "payment",
    entityId: paymentId,
  });

  revalidatePath("/admin/payments");
}

/**
 * Approve an incoming crypto buy-in. This is the step that actually lets
 * someone into a challenge, so it does both halves in one transaction: the
 * payment is confirmed and the participant is marked paid. Confirming the
 * payment alone used to leave the player outside the challenge.
 */
export async function approveCryptoBuyIn(paymentId: string) {
  const admin = await requireAdmin();

  const payment = await db.query.payments.findFirst({ where: eq(payments.id, paymentId) });
  if (!payment) throw new Error("Betaling niet gevonden.");
  if (payment.status !== "pending") throw new Error("Deze betaling is al afgehandeld.");

  await db.transaction(async (tx) => {
    await tx
      .update(payments)
      .set({ status: "confirmed", confirmedBy: admin.id, confirmedAt: new Date() })
      .where(eq(payments.id, paymentId));
    await tx
      .update(challengeParticipants)
      .set({ paidBuyIn: true, paidAt: new Date() })
      .where(
        and(
          eq(challengeParticipants.challengeId, payment.challengeId),
          eq(challengeParticipants.userId, payment.userId)
        )
      );
  });

  await evaluateReferralMissions(payment.userId);

  await logAuditEvent({
    actorId: admin.id,
    action: "payment.approve_buy_in",
    entityType: "payment",
    entityId: paymentId,
    after: { network: payment.network, txHash: payment.txHash, amount: payment.amount },
  });

  // The player is already in — a mail failure here must not undo that.
  try {
    const [challenge, profile, email] = await Promise.all([
      db.query.challenges.findFirst({
        where: eq(challenges.id, payment.challengeId),
        columns: { name: true, startingBalance: true },
      }),
      db.query.profiles.findFirst({
        where: eq(profiles.id, payment.userId),
        columns: { username: true },
      }),
      getUserEmail(payment.userId),
    ]);
    if (challenge && email) {
      const mail = challengeWelcomeEmail({
        username: profile?.username ?? "speler",
        challengeName: challenge.name,
        startingBalance: challenge.startingBalance,
        appUrl: `${getSiteUrl()}/app`,
      });
      await sendEmail({ to: email, ...mail });
    }
  } catch (err) {
    console.error("[email] welkomstmail bij goedkeuring mislukt:", err instanceof Error ? err.message : err);
  }

  revalidatePath("/admin/payments");
  revalidatePath("/app/pay");
}

export async function rejectCryptoBuyIn(paymentId: string, formData: FormData) {
  const admin = await requireAdmin();
  const reason = String(formData.get("reason") ?? "").trim() || "Geen reden opgegeven";

  await db
    .update(payments)
    .set({ status: "rejected", confirmedBy: admin.id, confirmedAt: new Date(), reference: reason })
    .where(eq(payments.id, paymentId));

  await logAuditEvent({
    actorId: admin.id,
    action: "payment.reject_buy_in",
    entityType: "payment",
    entityId: paymentId,
    after: { reason },
  });

  revalidatePath("/admin/payments");
  revalidatePath("/app/pay");
}

/** Short-lived signed URL for the transaction screenshot, admin-only. */
export async function getPaymentScreenshotUrl(paymentId: string): Promise<string | null> {
  await requireAdmin();
  const payment = await db.query.payments.findFirst({
    where: eq(payments.id, paymentId),
    columns: { screenshotUrl: true },
  });
  if (!payment?.screenshotUrl) return null;
  return getProofScreenshotSignedUrl(payment.screenshotUrl);
}
