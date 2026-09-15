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

export type SettingsState = { saved?: boolean };

export async function updateChallengeSportsbookSettings(
  challengeId: string,
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
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
  return { saved: true };
}

/**
 * The two challenge knobs that had columns but no UI: the pot set aside for
 * mission payouts, and whether a bust player may buy back in (§5.2, §13).
 */
export async function updateChallengeRules(
  challengeId: string,
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  await requireAdmin();

  const budgetRaw = formData.get("missionBudget");
  const missionBudget = budgetRaw === null || budgetRaw === "" ? 0 : Number(budgetRaw);
  if (!Number.isFinite(missionBudget) || missionBudget < 0) return {};

  const durationRaw = formData.get("durationType");
  const prizeRaw = formData.get("prizeMode");
  const lateJoinRaw = formData.get("lateJoinDays");
  const lateJoinDays = lateJoinRaw === null || lateJoinRaw === "" ? 0 : Number(lateJoinRaw);
  if (!Number.isInteger(lateJoinDays) || lateJoinDays < 0) return {};

  const bountyEnabled = formData.get("bountyEnabled") === "on";
  const bountyRaw = formData.get("bountyPerPlayer");
  const bountyPerPlayer = bountyRaw === null || bountyRaw === "" ? 0 : Number(bountyRaw);
  if (!Number.isFinite(bountyPerPlayer) || bountyPerPlayer < 0) return {};

  const DURATION_TYPES = ["week", "month", "season", "custom"] as const;
  const PRIZE_MODES = ["standard", "hardcore"] as const;
  type DurationType = (typeof DURATION_TYPES)[number];
  type PrizeMode = (typeof PRIZE_MODES)[number];
  const durationType = DURATION_TYPES.includes(durationRaw as DurationType)
    ? (durationRaw as DurationType)
    : null;
  const prizeMode = PRIZE_MODES.includes(prizeRaw as PrizeMode) ? (prizeRaw as PrizeMode) : null;
  if (durationType === null || prizeMode === null) return {};

  if (bountyEnabled) {
    // Same rule as the create form (§2): the bounty is carved out of the
    // buy-in, so it can never be the whole buy-in or more.
    const current = await db.query.challenges.findFirst({
      where: eq(challenges.id, challengeId),
      columns: { buyInAmount: true },
    });
    if (!current || bountyPerPlayer >= current.buyInAmount) return {};
  }

  await db
    .update(challenges)
    .set({
      missionBudget,
      allowRebuy: formData.get("allowRebuy") === "on",
      durationType,
      prizeMode,
      lateJoinDays,
      bountyEnabled,
      bountyPerPlayer,
      updatedAt: new Date(),
    })
    .where(eq(challenges.id, challengeId));

  revalidatePath(`/admin/challenges/${challengeId}`);
  return { saved: true };
}
