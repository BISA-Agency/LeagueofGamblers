"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAuditEvent } from "@/lib/audit";
import { isAdminEmail } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getNetwork } from "@/lib/payments/networks";
import { getReferralCredits } from "@/lib/referrals/credits";
import { profiles, referralPayouts } from "@drizzle/schema";
import { createClient } from "@/lib/supabase/server";

export type PayoutState = { error?: string; ok?: string };

/**
 * Records an affiliate commission that has already been sent in crypto.
 *
 * It records; it does not send. The transfer happens from the admin's own
 * wallet, and this is the note that says it happened — without which the same
 * commission gets paid a second time next month, which is the only mistake
 * here that costs real money.
 */
export async function recordReferralPayout(
  _prev: PayoutState,
  formData: FormData
): Promise<PayoutState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) redirect("/login");

  const userId = String(formData.get("userId") ?? "");
  const amount = Number(formData.get("amount"));
  const network = String(formData.get("network") ?? "").trim() || null;
  const txHash = String(formData.get("txHash") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim().slice(0, 200) || null;

  const target = await db.query.profiles.findFirst({
    where: eq(profiles.id, userId),
    columns: { id: true, username: true },
  });
  if (!target) return { error: "Speler niet gevonden." };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Vul een bedrag in." };
  if (network && !getNetwork(network)) return { error: "Onbekend netwerk." };

  // Never more than is owed. A typo in the amount field is otherwise money
  // out of the door with nothing to reconcile it against.
  const credits = await getReferralCredits(userId);
  if (amount > credits.outstanding) {
    return {
      error: `${target.username} heeft nog €${credits.outstanding.toFixed(2)} openstaan — dat is minder dan €${amount.toFixed(2)}.`,
    };
  }

  try {
    await db.insert(referralPayouts).values({
      userId,
      amount,
      network,
      txHash,
      note,
      paidBy: user.id,
    });
  } catch (err) {
    // The unique index on tx_hash is the guard against logging one transfer
    // twice — worth its own message, since that is exactly the slip it exists
    // to catch.
    const message = err instanceof Error ? err.message : "";
    if (message.includes("tx_hash")) {
      return { error: "Deze transactiehash is al vastgelegd." };
    }
    throw err;
  }

  await logAuditEvent({
    actorId: user.id,
    action: "referral_payout.record",
    entityType: "profile",
    entityId: userId,
    after: { amount, network, txHash },
  });

  revalidatePath("/admin/referrals");
  return { ok: `€${amount.toFixed(2)} vastgelegd voor ${target.username}.` };
}
