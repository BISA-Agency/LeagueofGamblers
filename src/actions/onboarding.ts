"use server";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isKnownCountry } from "@/lib/countries";
import { db } from "@/lib/db";
import { assignInviter, ensureInviteCode } from "@/lib/referrals/assign";
import { normalizeInviteCode } from "@/lib/referrals/code";
import { profiles } from "@drizzle/schema";
import { createClient } from "@/lib/supabase/server";
import { onboardingSchema } from "@/lib/validation/profile";

export type OnboardingState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function completeOnboarding(
  _prevState: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const rulesAccepted = formData.get("rulesAccepted") === "on";
  if (!rulesAccepted) {
    return {
      error: "Je moet de spelregels gelezen en geaccepteerd hebben om verder te gaan.",
    };
  }

  const countryRaw = String(formData.get("country") ?? "").toUpperCase();
  const country = countryRaw && isKnownCountry(countryRaw) ? countryRaw : null;

  const parsed = onboardingSchema.safeParse({
    username: formData.get("username"),
    favoriteClub: formData.get("favoriteClub") || undefined,
    favoriteSport: formData.get("favoriteSport") || undefined,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? "form";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const existing = await db.query.profiles.findFirst({
    where: eq(profiles.username, parsed.data.username),
  });
  if (existing && existing.id !== user.id) {
    return { fieldErrors: { username: "Deze gebruikersnaam is al bezet." } };
  }

  try {
    await db
      .insert(profiles)
      .values({
        id: user.id,
        username: parsed.data.username,
        favoriteClub: parsed.data.favoriteClub ?? null,
        favoriteSport: parsed.data.favoriteSport ?? null,
        country,
        rulesAcceptedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: profiles.id,
        set: {
          username: parsed.data.username,
          favoriteClub: parsed.data.favoriteClub ?? null,
          favoriteSport: parsed.data.favoriteSport ?? null,
          country,
          rulesAcceptedAt: new Date(),
        },
      });
  } catch (err) {
    if (err instanceof Error && "code" in err && err.code === "23505") {
      return { fieldErrors: { username: "Deze gebruikersnaam is al bezet." } };
    }
    throw err;
  }

  // Both are best-effort: a referral that cannot be resolved must never stop
  // somebody finishing onboarding.
  try {
    await ensureInviteCode(user.id);

    const jar = await cookies();
    const raw = jar.get("log_ref")?.value;
    const code = raw ? normalizeInviteCode(raw) : null;
    if (code) {
      // Safe to call unconditionally: assignInviter only writes when there is
      // no inviter yet, so re-running onboarding cannot rewrite the credit.
      await assignInviter(user.id, code);
      jar.delete("log_ref");
    }
  } catch (err) {
    console.error("[referrals] onboarding:", err instanceof Error ? err.message : err);
  }

  redirect("/app");
}
