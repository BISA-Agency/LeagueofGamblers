"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { feedReactions } from "@drizzle/schema";
import { createClient } from "@/lib/supabase/server";

export async function toggleReaction(feedId: string, emoji: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const existing = await db.query.feedReactions.findFirst({
    where: and(
      eq(feedReactions.feedId, feedId),
      eq(feedReactions.userId, user.id),
      eq(feedReactions.emoji, emoji)
    ),
  });

  if (existing) {
    await db
      .delete(feedReactions)
      .where(
        and(
          eq(feedReactions.feedId, feedId),
          eq(feedReactions.userId, user.id),
          eq(feedReactions.emoji, emoji)
        )
      );
  } else {
    await db.insert(feedReactions).values({ feedId, userId: user.id, emoji });
  }

  revalidatePath("/app");
}
