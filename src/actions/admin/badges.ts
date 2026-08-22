"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAuditEvent } from "@/lib/audit";
import { isAdminEmail } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { badges, userBadges, type BadgeRarity } from "@drizzle/schema";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) redirect("/login");
  return user;
}

export type CreateBadgeState = { error?: string };

export async function createBadge(
  _prevState: CreateBadgeState,
  formData: FormData
): Promise<CreateBadgeState> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const icon = String(formData.get("icon") ?? "").trim();
  const rarity = String(formData.get("rarity") ?? "common") as BadgeRarity;
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!name || !description || !icon) return { error: "Alle velden zijn verplicht." };

  await db.insert(badges).values({ slug, name, description, icon, rarity, isSystem: false });

  revalidatePath("/admin/badges");
  return {};
}

export async function awardBadgeManually(badgeId: string, userId: string, challengeId: string | null) {
  const admin = await requireAdmin();

  await db.insert(userBadges).values({ badgeId, userId, challengeId, awardedBy: admin.id }).onConflictDoNothing();

  await logAuditEvent({
    actorId: admin.id,
    action: "badge.award_manual",
    entityType: "user_badge",
    entityId: badgeId,
    after: { userId, challengeId },
  });

  revalidatePath("/admin/badges");
}
