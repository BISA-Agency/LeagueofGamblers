"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminEmail } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import type { PrizeSplitEntry } from "@/lib/settlement/payouts";
import { prizeTiers } from "@drizzle/schema";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) redirect("/login");
}

export type CreatePrizeTierState = { error?: string };

export async function createPrizeTier(
  _prevState: CreatePrizeTierState,
  formData: FormData
): Promise<CreatePrizeTierState> {
  await requireAdmin();

  const minPlayers = Number(formData.get("minPlayers"));
  const maxPlayersRaw = formData.get("maxPlayers");
  const label = String(formData.get("label") ?? "").trim();
  const ranks = formData.getAll("rank").map(Number);
  const percents = formData.getAll("percent").map(Number);

  if (!minPlayers || minPlayers < 2) return { error: "Minimaal aantal spelers moet 2+ zijn." };
  if (!label) return { error: "Label is verplicht." };
  if (ranks.length === 0) return { error: "Voeg minstens één plaats toe." };

  const totalPercent = percents.reduce((sum, p) => sum + p, 0);
  if (Math.abs(totalPercent - 100) > 0.01) {
    return { error: `Percentages moeten optellen tot 100% (nu ${totalPercent}%).` };
  }

  const split: PrizeSplitEntry[] = ranks.map((rank, i) => ({ rank, percent: percents[i] }));

  await db.insert(prizeTiers).values({
    minPlayers,
    maxPlayers: maxPlayersRaw ? Number(maxPlayersRaw) : null,
    split,
    label,
  });

  revalidatePath("/admin/prize-tiers");
  return {};
}
