"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getNetwork } from "@/lib/payments/networks";
import { quoteUsdt, totalWithFee } from "@/lib/payments/rate";
import { uploadPaymentScreenshot, validateScreenshotFile } from "@/lib/storage/screenshots";
import { challengeParticipants, challenges, payments } from "@drizzle/schema";
import { createClient } from "@/lib/supabase/server";

export type CryptoPaymentState = { error?: string; fieldErrors?: Record<string, string> };

/** Loose on purpose: hash formats differ per chain, and the admin verifies on the explorer anyway. */
const TX_HASH = /^(0x)?[A-Za-z0-9]{32,120}$/;

export async function submitCryptoPayment(
  challengeId: string,
  _prev: CryptoPaymentState,
  formData: FormData
): Promise<CryptoPaymentState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const networkId = String(formData.get("network") ?? "");
  const network = getNetwork(networkId);
  if (!network) return { fieldErrors: { network: "Kies een netwerk." } };

  const txHash = String(formData.get("txHash") ?? "").trim();
  if (!TX_HASH.test(txHash)) {
    return { fieldErrors: { txHash: "Vul de volledige transactiehash in." } };
  }

  const screenshot = formData.get("screenshot");
  if (!(screenshot instanceof File) || screenshot.size === 0) {
    return { fieldErrors: { screenshot: "Screenshot van de transactie is verplicht." } };
  }
  const screenshotError = validateScreenshotFile(screenshot);
  if (screenshotError) return { fieldErrors: { screenshot: screenshotError } };

  const participation = await db.query.challengeParticipants.findFirst({
    where: and(
      eq(challengeParticipants.challengeId, challengeId),
      eq(challengeParticipants.userId, user.id)
    ),
  });
  if (!participation) return { error: "Je doet niet mee aan deze challenge." };
  if (participation.paidBuyIn) return { error: "Je inleg is al bevestigd." };

  const challenge = await db.query.challenges.findFirst({ where: eq(challenges.id, challengeId) });
  if (!challenge) return { error: "Challenge niet gevonden." };

  // One open claim at a time — a second one just muddles the admin queue.
  const existing = await db.query.payments.findFirst({
    where: and(
      eq(payments.challengeId, challengeId),
      eq(payments.userId, user.id),
      eq(payments.status, "pending")
    ),
    columns: { id: true },
  });
  if (existing) {
    return { error: "Je hebt al een betaling ingediend die nog gecontroleerd wordt." };
  }

  const { fee, total } = totalWithFee(challenge.buyInAmount, challenge.platformFeePercent);
  const quote = await quoteUsdt(total);

  let paymentId: string;
  try {
    const [row] = await db
      .insert(payments)
      .values({
        provider: "crypto",
        direction: "buy_in",
        amount: challenge.buyInAmount,
        feeAmount: fee,
        currency: challenge.currency,
        status: "pending",
        network: network.id,
        txHash,
        tokenAmount: quote.tokenAmount,
        challengeId,
        userId: user.id,
      })
      .returning();
    paymentId = row.id;
  } catch (err) {
    // The unique index on tx_hash is the real defence against one transaction
    // being claimed by two players, or twice by the same one.
    const message = err instanceof Error ? err.message : "";
    if (message.includes("tx_hash")) {
      return { fieldErrors: { txHash: "Deze transactie is al ingediend." } };
    }
    return { error: "Indienen mislukt. Probeer het opnieuw." };
  }

  const path = await uploadPaymentScreenshot(user.id, paymentId, screenshot);
  await db.update(payments).set({ screenshotUrl: path }).where(eq(payments.id, paymentId));

  revalidatePath("/app/pay");
  revalidatePath(`/app/pay/${challengeId}`);
  return {};
}
