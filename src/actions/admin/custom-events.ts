"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit";
import { isAdminEmail } from "@/lib/auth/admin";
import { amsterdamLocalToUtc } from "@/lib/datetime";
import { db } from "@/lib/db";
import { settleMarketManually, voidEvent } from "@/lib/settlement/execute";
import type { SettlementOutcome } from "@/lib/settlement/markets";
import { events, markets, outcomes } from "@drizzle/schema";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) redirect("/login");
  return user;
}

const createCustomEventSchema = z.object({
  sportLabel: z.string().trim().min(1, "Verplicht."),
  name: z.string().trim().min(3, "Minimaal 3 tekens."),
  startsAt: z.string().min(1, "Aanvangstijd verplicht."),
  marketLabel: z.string().trim().min(1, "Verplicht."),
  outcomeLabels: z.array(z.string().trim().min(1)).min(2, "Minimaal 2 uitkomsten."),
  outcomeOdds: z.array(z.coerce.number().positive("Odds moeten positief zijn.")).min(2),
});

export type CreateCustomEventState = { error?: string; fieldErrors?: Record<string, string> };

export async function createCustomEvent(
  challengeId: string,
  _prevState: CreateCustomEventState,
  formData: FormData
): Promise<CreateCustomEventState> {
  const admin = await requireAdmin();

  const outcomeLabels = formData.getAll("outcomeLabel").map(String).filter(Boolean);
  const outcomeOdds = formData.getAll("outcomeOdds").map(String).filter(Boolean);

  const parsed = createCustomEventSchema.safeParse({
    sportLabel: formData.get("sportLabel"),
    name: formData.get("name"),
    startsAt: formData.get("startsAt"),
    marketLabel: formData.get("marketLabel"),
    outcomeLabels,
    outcomeOdds,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? "form";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }
  if (parsed.data.outcomeLabels.length !== parsed.data.outcomeOdds.length) {
    return { error: "Elke uitkomst moet een quotering hebben." };
  }

  const startsAt = amsterdamLocalToUtc(parsed.data.startsAt);
  if (Number.isNaN(startsAt.getTime())) return { error: "Ongeldige datum." };

  const [event] = await db
    .insert(events)
    .values({
      challengeId,
      source: "admin",
      sportKey: "custom",
      sportLabel: parsed.data.sportLabel,
      name: parsed.data.name,
      startsAt,
      status: "upcoming",
    })
    .returning();

  const [market] = await db
    .insert(markets)
    .values({ eventId: event.id, type: "custom", label: parsed.data.marketLabel })
    .returning();

  await db.insert(outcomes).values(
    parsed.data.outcomeLabels.map((label, i) => ({
      marketId: market.id,
      label,
      odds: parsed.data.outcomeOdds[i],
    }))
  );

  await logAuditEvent({
    actorId: admin.id,
    action: "custom_event.create",
    entityType: "event",
    entityId: event.id,
    after: { name: event.name, startsAt },
  });

  revalidatePath(`/admin/challenges/${challengeId}/sportsbook`);
  redirect(`/admin/challenges/${challengeId}/sportsbook`);
}

export async function suspendEvent(eventId: string, challengeId: string) {
  await requireAdmin();
  await db.update(events).set({ status: "suspended" }).where(eq(events.id, eventId));
  revalidatePath(`/admin/challenges/${challengeId}/sportsbook`);
}

export async function reopenEvent(eventId: string, challengeId: string) {
  await requireAdmin();
  await db.update(events).set({ status: "upcoming" }).where(eq(events.id, eventId));
  revalidatePath(`/admin/challenges/${challengeId}/sportsbook`);
}

/**
 * Suspending the whole event blocks every market on it; this pulls a single
 * market (say a shaky totals line) while the rest stays bettable.
 */
export async function suspendMarket(marketId: string, challengeId: string) {
  const admin = await requireAdmin();
  await db.update(markets).set({ status: "suspended" }).where(eq(markets.id, marketId));
  await logAuditEvent({
    actorId: admin.id,
    action: "market.suspend",
    entityType: "market",
    entityId: marketId,
  });
  revalidatePath(`/admin/challenges/${challengeId}/sportsbook`);
}

export async function reopenMarket(marketId: string, challengeId: string) {
  const admin = await requireAdmin();
  await db.update(markets).set({ status: "open" }).where(eq(markets.id, marketId));
  await logAuditEvent({
    actorId: admin.id,
    action: "market.reopen",
    entityType: "market",
    entityId: marketId,
  });
  revalidatePath(`/admin/challenges/${challengeId}/sportsbook`);
}

export async function voidEventAction(eventId: string, challengeId: string) {
  const admin = await requireAdmin();
  await voidEvent(eventId);
  await logAuditEvent({
    actorId: admin.id,
    action: "event.void",
    entityType: "event",
    entityId: eventId,
    reason: "Afgelast of verplaatst door admin",
  });
  revalidatePath(`/admin/challenges/${challengeId}/sportsbook`);
}

export async function settleCustomMarket(
  marketId: string,
  challengeId: string,
  winningOutcomeId: string
) {
  const admin = await requireAdmin();

  const market = await db.query.markets.findFirst({
    where: eq(markets.id, marketId),
    with: { outcomes: true },
  });
  if (!market) throw new Error("Markt niet gevonden.");

  const outcomeResults: { outcomeId: string; result: SettlementOutcome }[] = market.outcomes.map(
    (o) => ({ outcomeId: o.id, result: o.id === winningOutcomeId ? "won" : "lost" })
  );

  await settleMarketManually(marketId, outcomeResults);
  await db.update(events).set({ status: "finished" }).where(eq(events.id, market.eventId));

  await logAuditEvent({
    actorId: admin.id,
    action: "market.settle_manual",
    entityType: "market",
    entityId: marketId,
    after: { winningOutcomeId },
  });

  revalidatePath(`/admin/challenges/${challengeId}/sportsbook`);
}
