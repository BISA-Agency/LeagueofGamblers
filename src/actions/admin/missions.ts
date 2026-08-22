"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAuditEvent } from "@/lib/audit";
import { isAdminEmail } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { awardMission } from "@/lib/missions/engine";
import { MISSION_TYPE_OPTIONS } from "@/lib/missions/admin-fields";
import { missionCompletions, missions, type MissionAppliesTo } from "@drizzle/schema";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) redirect("/login");
  return user;
}

export type CreateMissionState = { error?: string };

export async function createMission(
  challengeId: string,
  _prevState: CreateMissionState,
  formData: FormData
): Promise<CreateMissionState> {
  await requireAdmin();

  const type = String(formData.get("type") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const appliesTo = String(formData.get("appliesTo") ?? "both") as MissionAppliesTo;
  const rewardAmountRaw = formData.get("rewardAmount");
  const rewardXpRaw = formData.get("rewardXp");
  const maxWinnersRaw = formData.get("maxWinners");
  const repeatable = formData.get("repeatable") === "on";
  const hidden = formData.get("hidden") === "on";

  if (!title || title.length < 3) return { error: "Titel moet minimaal 3 tekens zijn." };
  if (!description) return { error: "Omschrijving is verplicht." };

  const typeOption = MISSION_TYPE_OPTIONS.find((t) => t.value === type);
  if (!typeOption) return { error: "Onbekend missietype." };

  const params: Record<string, string | number> = {};
  for (const field of typeOption.params) {
    const raw = formData.get(`param_${field.key}`);
    if (raw === null || raw === "") return { error: `${field.label} is verplicht.` };
    params[field.key] = field.type === "number" ? Number(raw) : String(raw);
  }

  await db.insert(missions).values({
    challengeId,
    title,
    description,
    type,
    params,
    appliesTo,
    rewardAmount: rewardAmountRaw ? Number(rewardAmountRaw) : null,
    rewardXp: rewardXpRaw ? Number(rewardXpRaw) : null,
    maxWinners: maxWinnersRaw ? Number(maxWinnersRaw) : null,
    repeatable,
    hidden,
  });

  revalidatePath(`/admin/challenges/${challengeId}/missions`);
  redirect(`/admin/challenges/${challengeId}/missions`);
}

export async function awardMissionManually(missionId: string, userId: string, challengeId: string) {
  const admin = await requireAdmin();

  const mission = await db.query.missions.findFirst({ where: eq(missions.id, missionId) });
  if (!mission) throw new Error("Missie niet gevonden.");

  if (!mission.repeatable) {
    const existing = await db.query.missionCompletions.findFirst({
      where: and(
        eq(missionCompletions.missionId, missionId),
        eq(missionCompletions.userId, userId),
        eq(missionCompletions.challengeId, challengeId)
      ),
    });
    if (existing) throw new Error("Deze speler heeft deze missie al gehaald.");
  }

  await awardMission(mission, userId, challengeId, null);

  await logAuditEvent({
    actorId: admin.id,
    action: "mission.award_manual",
    entityType: "mission_completion",
    entityId: missionId,
    after: { userId, challengeId },
  });

  revalidatePath(`/admin/challenges/${challengeId}/missions`);
}
