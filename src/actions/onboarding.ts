"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { isKnownCountry } from "@/lib/countries";
import { db } from "@/lib/db";
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

  redirect("/app");
}
