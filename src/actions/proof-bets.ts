"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logActivity } from "@/lib/activity/log";
import { db } from "@/lib/db";
import { amsterdamLocalToUtc } from "@/lib/datetime";
import { evaluateMissionsForSettledBet } from "@/lib/missions/engine";
import { checkAndMarkBust, voidAndRefundBet } from "@/lib/settlement/execute";
import { uploadProofScreenshot, validateScreenshotFile } from "@/lib/storage/screenshots";
import { betFlags, betSelections, bets, challengeParticipants, type Bookmaker } from "@drizzle/schema";
import { createClient } from "@/lib/supabase/server";

export type ProofBetState = { error?: string; fieldErrors?: Record<string, string> };

const selectionSchema = z.object({
  eventName: z.string().trim().min(1, "Verplicht."),
  eventStart: z.string().min(1, "Verplicht."),
  marketLabel: z.string().trim().min(1, "Verplicht."),
  selectionLabel: z.string().trim().min(1, "Verplicht."),
  odds: z.coerce.number().min(1.01, "Odds moeten minstens 1.01 zijn."),
});

export async function createProofBet(
  challengeId: string,
  _prevState: ProofBetState,
  formData: FormData
): Promise<ProofBetState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sport = String(formData.get("sport") ?? "").trim();
  const competition = String(formData.get("competition") ?? "").trim() || undefined;
  const bookmaker = String(formData.get("bookmaker") ?? "") as Bookmaker;
  const stakeRaw = Number(formData.get("stake"));
  const note = String(formData.get("note") ?? "").trim().slice(0, 140) || null;
  const screenshot = formData.get("screenshot");

  if (!sport) return { fieldErrors: { sport: "Verplicht." } };
  if (!(screenshot instanceof File) || screenshot.size === 0) {
    return { fieldErrors: { screenshot: "Screenshot is verplicht." } };
  }
  const screenshotError = validateScreenshotFile(screenshot);
  if (screenshotError) return { fieldErrors: { screenshot: screenshotError } };
  if (!Number.isFinite(stakeRaw) || stakeRaw <= 0) {
    return { fieldErrors: { stake: "Vul een geldige inzet in." } };
  }

  const eventNames = formData.getAll("eventName").map(String);
  const eventStarts = formData.getAll("eventStart").map(String);
  const marketLabels = formData.getAll("marketLabel").map(String);
  const selectionLabels = formData.getAll("selectionLabel").map(String);
  const oddsList = formData.getAll("odds").map(String);

  if (eventNames.length === 0) return { error: "Voeg minstens één selectie toe." };

  const selections: {
    eventName: string;
    eventStartDate: Date;
    marketLabel: string;
    selectionLabel: string;
    odds: number;
  }[] = [];

  for (let i = 0; i < eventNames.length; i++) {
    const parsed = selectionSchema.safeParse({
      eventName: eventNames[i],
      eventStart: eventStarts[i],
      marketLabel: marketLabels[i],
      selectionLabel: selectionLabels[i],
      odds: oddsList[i],
    });
    if (!parsed.success) {
      return { error: `Selectie ${i + 1}: ${parsed.error.issues[0]?.message ?? "ongeldig"}` };
    }
    selections.push({ ...parsed.data, eventStartDate: amsterdamLocalToUtc(parsed.data.eventStart) });
  }

  const now = new Date();
  const earliestStart = selections.reduce(
    (min, s) => (s.eventStartDate < min ? s.eventStartDate : min),
    selections[0].eventStartDate
  );
  if (earliestStart <= now) {
    return {
      error: "De vroegste wedstrijd is al begonnen — deze bewijsbet kan niet meer geplaatst worden.",
    };
  }

  const stake = Math.round(stakeRaw * 100) / 100;
  const totalOdds = selections.reduce((acc, s) => acc * s.odds, 1);
  const potentialPayout = Math.round(stake * totalOdds * 100) / 100;

  let betId: string;
  try {
    betId = await db.transaction(async (tx) => {
      const participant = await tx.query.challengeParticipants.findFirst({
        where: and(
          eq(challengeParticipants.challengeId, challengeId),
          eq(challengeParticipants.userId, user.id)
        ),
      });
      if (!participant) throw new Error("Je doet niet mee aan deze challenge.");
      if (stake > participant.balance) throw new Error("Je inzet is hoger dan je saldo.");

      const [bet] = await tx
        .insert(bets)
        .values({
          challengeId,
          userId: user.id,
          kind: "proof",
          type: selections.length > 1 ? "combi" : "single",
          stake,
          wasAllIn: stake === participant.balance,
          totalOdds,
          potentialPayout,
          eventStart: earliestStart,
          bookmaker,
          note,
          verificationStatus: "pending",
        })
        .returning();

      await tx.insert(betSelections).values(
        selections.map((s) => ({
          betId: bet.id,
          eventName: s.eventName,
          eventStart: s.eventStartDate,
          sport,
          competition,
          marketLabel: s.marketLabel,
          selectionLabel: s.selectionLabel,
          odds: s.odds,
        }))
      );

      await tx
        .update(challengeParticipants)
        .set({ balance: sql`${challengeParticipants.balance} - ${stake}` })
        .where(
          and(
            eq(challengeParticipants.challengeId, challengeId),
            eq(challengeParticipants.userId, user.id)
          )
        );

      return bet.id;
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Plaatsen mislukt. Probeer het opnieuw." };
  }

  const screenshotPath = await uploadProofScreenshot(user.id, betId, screenshot);
  await db.update(bets).set({ screenshotUrl: screenshotPath }).where(eq(bets.id, betId));

  revalidatePath("/app/bets");
  redirect("/app/bets");
}

export async function settleProofBetSelf(betId: string, status: "won" | "lost" | "void") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const bet = await db.query.bets.findFirst({ where: eq(bets.id, betId) });
  if (!bet || bet.userId !== user.id || bet.kind !== "proof") {
    throw new Error("Bewijsbet niet gevonden.");
  }
  if (bet.status !== "open") throw new Error("Deze bet is al afgerond.");
  if (bet.eventStart > new Date()) throw new Error("De wedstrijd is nog niet begonnen.");

  if (status === "void") {
    await voidAndRefundBet(betId);
    await checkAndMarkBust(bet.challengeId, bet.userId);
  } else if (status === "won") {
    await db.transaction(async (tx) => {
      await tx
        .update(bets)
        .set({ status: "won", settledAt: new Date(), settlementSource: "Zelf gesetteld door speler" })
        .where(eq(bets.id, betId));
      await tx
        .update(challengeParticipants)
        .set({ balance: sql`${challengeParticipants.balance} + ${bet.potentialPayout}` })
        .where(
          and(
            eq(challengeParticipants.challengeId, bet.challengeId),
            eq(challengeParticipants.userId, bet.userId)
          )
        );
    });
    await logActivity(bet.challengeId, bet.userId, "bet_won", {
      payout: bet.potentialPayout,
      odds: bet.totalOdds,
    });
    await evaluateMissionsForSettledBet(betId);
  } else {
    await db
      .update(bets)
      .set({ status: "lost", settledAt: new Date(), settlementSource: "Zelf gesetteld door speler" })
      .where(eq(bets.id, betId));
    await logActivity(bet.challengeId, bet.userId, "bet_lost", { stake: bet.stake });
    await checkAndMarkBust(bet.challengeId, bet.userId);
    await evaluateMissionsForSettledBet(betId);
  }

  revalidatePath("/app/bets");
}

export async function flagBet(betId: string, reason: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!reason.trim()) throw new Error("Geef een reden op.");

  await db.insert(betFlags).values({ betId, flaggedBy: user.id, reason: reason.trim() });
  revalidatePath("/app/bets");
}
