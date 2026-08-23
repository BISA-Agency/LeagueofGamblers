"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getNetwork, validateAddress } from "@/lib/payments/networks";
import { profiles } from "@drizzle/schema";
import { createClient } from "@/lib/supabase/server";

export type PayoutState = { error?: string; ok?: boolean };

/**
 * Where prize money goes. Kept separate from the rest of the profile form on
 * purpose: a rejected address must not throw away someone's edited bio, and
 * this is the one field where a typo costs real money.
 */
export async function updatePayoutMethod(
  _prev: PayoutState,
  formData: FormData
): Promise<PayoutState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const networkId = String(formData.get("payoutNetwork") ?? "");
  const address = String(formData.get("payoutAddress") ?? "").trim();

  // Clearing it is allowed — you might not want a payout address on file.
  if (!networkId && !address) {
    await db
      .update(profiles)
      .set({ payoutAddress: null, payoutNetwork: null })
      .where(eq(profiles.id, user.id));
    revalidatePath("/app/profile/edit");
    return { ok: true };
  }

  const network = getNetwork(networkId);
  if (!network) return { error: "Kies een netwerk." };

  const invalid = validateAddress(network.id, address);
  if (invalid) return { error: invalid };

  await db
    .update(profiles)
    .set({ payoutAddress: address, payoutNetwork: network.id })
    .where(eq(profiles.id, user.id));

  revalidatePath("/app/profile/edit");
  return { ok: true };
}
