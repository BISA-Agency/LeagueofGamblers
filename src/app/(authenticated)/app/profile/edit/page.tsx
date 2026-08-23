import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { profiles } from "@drizzle/schema";
import { createClient } from "@/lib/supabase/server";
import { PayoutMethodForm } from "@/components/payments/payout-method-form";
import { ProfileEditForm } from "./profile-edit-form";

export const metadata: Metadata = { title: "Profiel bewerken" };

export default async function ProfileEditPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await db.query.profiles.findFirst({ where: eq(profiles.id, user.id) });
  if (!profile) redirect("/onboarding");

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-6">
      <h1 className="text-lg font-semibold">Profiel bewerken</h1>
      <ProfileEditForm
        defaultValues={{
          bio: profile.bio ?? "",
          statusText: profile.statusText ?? "",
          favoriteClub: profile.favoriteClub ?? "",
          favoriteSport: profile.favoriteSport ?? "",
          country: profile.country,
        }}
      />

      <section className="space-y-2 border-t border-border pt-6">
        <div>
          <h2 className="text-sm font-medium">Uitbetaling</h2>
          <p className="text-xs text-muted-foreground">
            Waar prijzengeld naartoe gaat. Je kunt dit later altijd wijzigen.
          </p>
        </div>
        <PayoutMethodForm
          defaultNetwork={profile.payoutNetwork}
          defaultAddress={profile.payoutAddress}
        />
      </section>
    </div>
  );
}
