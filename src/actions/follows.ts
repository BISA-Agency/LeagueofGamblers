"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications/create";
import { follows, profiles } from "@drizzle/schema";
import { createClient } from "@/lib/supabase/server";

export async function toggleFollow(targetUserId: string, targetUsername: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (user.id === targetUserId) return;

  const where = and(eq(follows.followerId, user.id), eq(follows.followingId, targetUserId));
  const existing = await db.query.follows.findFirst({ where });

  if (existing) {
    await db.delete(follows).where(where);
  } else {
    await db.insert(follows).values({ followerId: user.id, followingId: targetUserId });
    const me = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
      columns: { username: true },
    });
    await createNotification({
      userId: targetUserId,
      type: "new_follower",
      payload: { username: me?.username ?? null },
    });
  }

  revalidatePath(`/app/profile/${targetUsername}`);
}
