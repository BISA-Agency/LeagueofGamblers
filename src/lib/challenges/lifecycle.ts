import { and, eq, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit";
import { challengeParticipants, challenges } from "@drizzle/schema";

/** open -> live for every challenge whose start date has passed: seeds balances for paid participants. */
export async function runOpenToLiveTransitions() {
  const due = await db.query.challenges.findMany({
    where: and(eq(challenges.status, "open"), lte(challenges.startAt, new Date())),
  });

  for (const challenge of due) {
    await db.transaction(async (tx) => {
      await tx
        .update(challengeParticipants)
        .set({ status: "active", balance: challenge.startingBalance })
        .where(
          and(
            eq(challengeParticipants.challengeId, challenge.id),
            eq(challengeParticipants.paidBuyIn, true),
            eq(challengeParticipants.status, "joined")
          )
        );
      await tx
        .update(challenges)
        .set({ status: "live", updatedAt: new Date() })
        .where(eq(challenges.id, challenge.id));
    });
    await logAuditEvent({
      actorId: null,
      action: "challenge.transition_live",
      entityType: "challenge",
      entityId: challenge.id,
      reason: "Automatisch via cron (startdatum bereikt)",
    });
  }

  return due.map((c) => c.id);
}

/** live -> settling for every challenge whose end date has passed. */
export async function runLiveToSettlingTransitions() {
  const due = await db.query.challenges.findMany({
    where: and(eq(challenges.status, "live"), lte(challenges.endAt, new Date())),
  });

  for (const challenge of due) {
    await db
      .update(challenges)
      .set({ status: "settling", updatedAt: new Date() })
      .where(eq(challenges.id, challenge.id));
    await logAuditEvent({
      actorId: null,
      action: "challenge.transition_settling",
      entityType: "challenge",
      entityId: challenge.id,
      reason: "Automatisch via cron (einddatum bereikt)",
    });
  }

  return due.map((c) => c.id);
}
