"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isKnownCountry } from "@/lib/countries";
import { db } from "@/lib/db";
import { profiles } from "@drizzle/schema";
import { createClient } from "@/lib/supabase/server";
import { profileEditSchema } from "@/lib/validation/profile";

export type ProfileEditState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function updateProfile(
  _prevState: ProfileEditState,
  formData: FormData
): Promise<ProfileEditState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const parsed = profileEditSchema.safeParse({
    bio: formData.get("bio") || undefined,
    statusText: formData.get("statusText") || undefined,
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

  const profile = await db.query.profiles.findFirst({ where: eq(profiles.id, user.id) });
  if (!profile) redirect("/onboarding");

  const countryRaw = String(formData.get("country") ?? "").toUpperCase();
  const country = countryRaw && isKnownCountry(countryRaw) ? countryRaw : null;

  await db
    .update(profiles)
    .set({
      bio: parsed.data.bio ?? null,
      statusText: parsed.data.statusText ?? null,
      favoriteClub: parsed.data.favoriteClub ?? null,
      favoriteSport: parsed.data.favoriteSport ?? null,
      country,
    })
    .where(eq(profiles.id, user.id));

  revalidatePath(`/app/profile/${profile.username}`);
  redirect(`/app/profile/${profile.username}`);
}
