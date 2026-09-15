"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { amsterdamLocalToUtc } from "@/lib/datetime";
import { db } from "@/lib/db";
import { challenges } from "@drizzle/schema";
import { isAdminEmail } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

const createChallengeSchema = z.object({
  name: z.string().trim().min(3, "Minimaal 3 tekens.").max(80),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Minimaal 3 tekens.")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Alleen kleine letters, cijfers en streepjes."),
  descriptionMd: z
    .string()
    .trim()
    .max(4000)
    .optional()
    .transform((v) => (v ? v : undefined)),
  startAt: z.string().min(1, "Startdatum verplicht."),
  endAt: z.string().min(1, "Einddatum verplicht."),
  startingBalance: z.coerce.number().positive("Moet groter dan 0 zijn."),
  buyInAmount: z.coerce.number().nonnegative(),
  maxPlayers: z.string().optional(),
  durationType: z.enum(["week", "month", "season", "custom"]).default("custom"),
  prizeMode: z.enum(["standard", "hardcore"]).default("standard"),
  lateJoinDays: z.coerce.number().int().nonnegative().default(0),
  bountyEnabled: z.coerce.boolean().default(false),
  bountyPerPlayer: z.coerce.number().nonnegative().default(0),
});

export type CreateChallengeState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) redirect("/login");
  return user;
}

export async function createChallenge(
  _prevState: CreateChallengeState,
  formData: FormData
): Promise<CreateChallengeState> {
  const user = await requireAdmin();

  const parsed = createChallengeSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    descriptionMd: formData.get("descriptionMd") || undefined,
    startAt: formData.get("startAt"),
    endAt: formData.get("endAt"),
    startingBalance: formData.get("startingBalance") || 10000,
    buyInAmount: formData.get("buyInAmount") || 100,
    maxPlayers: formData.get("maxPlayers") || undefined,
    durationType: formData.get("durationType") || "custom",
    prizeMode: formData.get("prizeMode") || "standard",
    lateJoinDays: formData.get("lateJoinDays") || 0,
    bountyEnabled: formData.get("bountyEnabled") === "on",
    bountyPerPlayer: formData.get("bountyPerPlayer") || 0,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? "form";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const startAt = amsterdamLocalToUtc(parsed.data.startAt);
  const endAt = amsterdamLocalToUtc(parsed.data.endAt);
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    return { error: "Ongeldige datum." };
  }
  if (endAt <= startAt) {
    return { fieldErrors: { endAt: "Einddatum moet na de startdatum liggen." } };
  }
  if (parsed.data.bountyEnabled && parsed.data.bountyPerPlayer >= parsed.data.buyInAmount) {
    return { fieldErrors: { bountyPerPlayer: "Moet lager zijn dan de inleg." } };
  }

  try {
    await db.insert(challenges).values({
      name: parsed.data.name,
      slug: parsed.data.slug,
      descriptionMd: parsed.data.descriptionMd ?? null,
      startAt,
      endAt,
      startingBalance: parsed.data.startingBalance,
      buyInAmount: parsed.data.buyInAmount,
      maxPlayers: parsed.data.maxPlayers ? Number(parsed.data.maxPlayers) : null,
      durationType: parsed.data.durationType,
      prizeMode: parsed.data.prizeMode,
      lateJoinDays: parsed.data.lateJoinDays,
      bountyEnabled: parsed.data.bountyEnabled,
      bountyPerPlayer: parsed.data.bountyPerPlayer,
      createdBy: user.id,
    });
  } catch (err) {
    if (err instanceof Error && "code" in err && err.code === "23505") {
      return { fieldErrors: { slug: "Deze slug is al in gebruik." } };
    }
    throw err;
  }

  revalidatePath("/admin/challenges");
  redirect("/admin/challenges");
}

export async function publishChallenge(challengeId: string) {
  await requireAdmin();
  await db
    .update(challenges)
    .set({ status: "open", updatedAt: new Date() })
    .where(eq(challenges.id, challengeId));
  revalidatePath("/admin/challenges");
}
