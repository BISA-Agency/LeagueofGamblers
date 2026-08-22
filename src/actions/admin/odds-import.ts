"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAuditEvent } from "@/lib/audit";
import { isAdminEmail } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { createImportPreview, publishImportRow } from "@/lib/odds-provider/run-import";
import { createClient } from "@/lib/supabase/server";
import { oddsImports } from "@drizzle/schema";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) redirect("/login");
  return user;
}

export async function runOddsImportPreview(challengeId: string) {
  const admin = await requireAdmin();
  const { importRow } = await createImportPreview(challengeId, admin.id);

  revalidatePath(`/admin/challenges/${challengeId}/sportsbook`);
  redirect(`/admin/challenges/${challengeId}/sportsbook/imports/${importRow.id}`);
}

export async function publishOddsImport(importId: string) {
  const admin = await requireAdmin();

  const importRow = await db.query.oddsImports.findFirst({ where: eq(oddsImports.id, importId) });
  if (!importRow) throw new Error("Import niet gevonden.");

  const payload = await publishImportRow(importId);

  await logAuditEvent({
    actorId: admin.id,
    action: "odds_import.publish",
    entityType: "odds_import",
    entityId: importId,
    after: { eventsCount: payload.events.length },
  });

  revalidatePath(`/admin/challenges/${importRow.challengeId}/sportsbook`);
  revalidatePath("/app/sportsbook");
  redirect(`/admin/challenges/${importRow.challengeId}/sportsbook`);
}

export async function discardOddsImport(importId: string) {
  await requireAdmin();
  const importRow = await db.query.oddsImports.findFirst({ where: eq(oddsImports.id, importId) });
  if (!importRow || importRow.status !== "preview") return;

  await db.update(oddsImports).set({ status: "discarded" }).where(eq(oddsImports.id, importId));
  revalidatePath(`/admin/challenges/${importRow.challengeId}/sportsbook`);
  redirect(`/admin/challenges/${importRow.challengeId}/sportsbook`);
}
