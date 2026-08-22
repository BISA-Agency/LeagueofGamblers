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

  await db
    .update(challenges)
    .set({ sportKeys, markets: marketTypes, autoPublishImports: autoPublish, updatedAt: new Date() })
    .where(eq(challenges.id, challengeId));

  revalidatePath(`/admin/challenges/${challengeId}`);
}
