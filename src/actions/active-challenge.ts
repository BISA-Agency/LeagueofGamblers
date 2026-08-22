"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACTIVE_CHALLENGE_COOKIE } from "@/lib/challenges/active";
import { db } from "@/lib/db";
import { challengeParticipants } from "@drizzle/schema";
import { createClient } from "@/lib/supabase/server";

export async function setActiveChallenge(challengeId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const participation = await db.query.challengeParticipants.findFirst({
    where: and(
      eq(challengeParticipants.challengeId, challengeId),
      eq(challengeParticipants.userId, user.id)
    ),
    columns: { userId: true },
  });
  if (!participation) throw new Error("Je doet niet mee aan deze challenge.");

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_CHALLENGE_COOKIE, challengeId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });

  // Every "active challenge" screen reads this, so the whole shell refreshes.
  revalidatePath("/app", "layout");
}
