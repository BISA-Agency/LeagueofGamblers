"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminEmail } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { challenges } from "@drizzle/schema";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) redirect("/login");
  return user;
}

export async function updateChallengeSportsbookSettings(
  challengeId: string,
  formData: FormData
) {
  await requireAdmin();

  const sportKeys = formData.getAll("sportKeys").map(String);
  const marketTypes = formData.getAll("marketTypes").map(String);
  const autoPublish = formData.get("autoPublishImports") === "on";
  const midweekImport = formData.get("midweekImportEnabled") === "on";

  await db
    .update(challenges)
    .set({
      sportKeys,
      markets: marketTypes,
      autoPublishImports: autoPublish,
      midweekImportEnabled: midweekImport,
      updatedAt: new Date(),
    })
    .where(eq(challenges.id, challengeId));

  revalidatePath(`/admin/challenges/${challengeId}`);
}

/**
 * The two challenge knobs that had columns but no UI: the pot set aside for
 * mission payouts, and whether a bust player may buy back in (§5.2, §13).
 */
export async function updateChallengeRules(challengeId: string, formData: FormData) {
  await requireAdmin();

  const budgetRaw = formData.get("missionBudget");
  const missionBudget = budgetRaw === null || budgetRaw === "" ? 0 : Number(budgetRaw);
  if (!Number.isFinite(missionBudget) || missionBudget < 0) return;

  await db
    .update(challenges)
    .set({
      missionBudget,
      allowRebuy: formData.get("allowRebuy") === "on",
      updatedAt: new Date(),
    })
    .where(eq(challenges.id, challengeId));

  revalidatePath(`/admin/challenges/${challengeId}`);
}
