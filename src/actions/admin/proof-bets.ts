"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAuditEvent } from "@/lib/audit";
import { isAdminEmail } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { evaluateProofBetBadges } from "@/lib/badges/triggers";
import { runPostSettlementChecks } from "@/lib/settlement/after-settlement";
import { bets, challengeParticipants, sanctions, type SanctionType } from "@drizzle/schema";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) redirect("/login");
  return user;
}

export async function approveProofBet(betId: string) {
  const admin = await requireAdmin();

  await db
    .update(bets)
    .set({ verificationStatus: "approved", verifiedBy: admin.id, verifiedAt: new Date() })
    .where(eq(bets.id, betId));

  await logAuditEvent({
    actorId: admin.id,
    action: "proof_bet.approve",
    entityType: "bet",
    entityId: betId,
  });

  // If the player already self-settled it before this approval landed, the
  // mission and badge checks still need a nudge now that it's approved.
  await runPostSettlementChecks(betId);

  const bet = await db.query.bets.findFirst({
    where: eq(bets.id, betId),
    columns: { userId: true },
  });
  if (bet) await evaluateProofBetBadges(bet.userId);

  revalidatePath("/admin/proof-bets");
}

export async function rejectProofBet(betId: string, reason: string) {
  const admin = await requireAdmin();
  if (!reason.trim()) throw new Error("Geef een reden op.");

  const bet = await db.query.bets.findFirst({ where: eq(bets.id, betId) });
  if (!bet) throw new Error("Bet niet gevonden.");

  await db.transaction(async (tx) => {
    await tx
      .update(bets)
      .set({
        verificationStatus: "rejected",
        verifiedBy: admin.id,
        verifiedAt: new Date(),
        rejectionReason: reason.trim(),
        status: "void",
        settledAt: new Date(),
        settlementSource: "Afgekeurd door admin",
      })
      .where(eq(bets.id, betId));

    if (bet.status === "open") {
      await tx
        .update(challengeParticipants)
        .set({ balance: sql`${challengeParticipants.balance} + ${bet.stake}` })
        .where(
          and(
            eq(challengeParticipants.challengeId, bet.challengeId),
            eq(challengeParticipants.userId, bet.userId)
          )
        );
    }
  });

  await logAuditEvent({
    actorId: admin.id,
    action: "proof_bet.reject",
    entityType: "bet",
    entityId: betId,
    reason: reason.trim(),
  });

  revalidatePath("/admin/proof-bets");
}

export async function issueSanction(
  userId: string,
  challengeId: string,
  type: SanctionType,
  reason: string,
  betId: string | null,
  amount: number | null
) {
  const admin = await requireAdmin();
  if (!reason.trim()) throw new Error("Geef een reden op.");

  await db.transaction(async (tx) => {
    await tx.insert(sanctions).values({
      userId,
      challengeId,
      type,
      reason: reason.trim(),
      betId,
      amount,
      issuedBy: admin.id,
    });

    if (type === "balance_penalty" && amount) {
      await tx
        .update(challengeParticipants)
        .set({ balance: sql`GREATEST(${challengeParticipants.balance} - ${amount}, 0)`, warnings: sql`${challengeParticipants.warnings} + 1` })
        .where(and(eq(challengeParticipants.challengeId, challengeId), eq(challengeParticipants.userId, userId)));
    } else if (type === "warning") {
      await tx
        .update(challengeParticipants)
        .set({ warnings: sql`${challengeParticipants.warnings} + 1` })
        .where(and(eq(challengeParticipants.challengeId, challengeId), eq(challengeParticipants.userId, userId)));
    } else if (type === "disqualification") {
      await tx
        .update(challengeParticipants)
        .set({ status: "disqualified" })
        .where(and(eq(challengeParticipants.challengeId, challengeId), eq(challengeParticipants.userId, userId)));
    }
  });

  await logAuditEvent({
    actorId: admin.id,
    action: "sanction.issue",
    entityType: "profile",
    entityId: userId,
    after: { type, reason, amount },
  });

  revalidatePath("/admin/proof-bets");
  revalidatePath(`/app/profile`);
}
