"use server";

import { and, count, eq, gte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createNotification } from "@/lib/notifications/create";
import { db } from "@/lib/db";
import { activityFeed, challengeParticipants, feedReactions } from "@drizzle/schema";
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

export type PostMessageState = { error?: string; ok?: boolean };

/**
 * Chat in the challenge timeline (§home/threads). parentId null posts a new
 * top-level message; set, it lands as a reply in that item's thread — and
 * replying to a reply flattens into the same thread, so conversations stay
 * one level deep.
 */
export async function postFeedMessage(
  challengeId: string,
  parentId: string | null,
  _prevState: PostMessageState,
  formData: FormData
): Promise<PostMessageState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const text = String(formData.get("text") ?? "").trim();
  if (!text) return { error: "Leeg bericht." };
  if (text.length > 280) return { error: "Max 280 tekens." };

  const participant = await db.query.challengeParticipants.findFirst({
    where: and(
      eq(challengeParticipants.challengeId, challengeId),
      eq(challengeParticipants.userId, user.id)
    ),
    columns: { userId: true },
  });
  if (!participant) return { error: "Je doet niet mee aan deze challenge." };

  // A crude brake on spam: at most 10 messages per minute per player.
  const [recent] = await db
    .select({ n: count() })
    .from(activityFeed)
    .where(
      and(
        eq(activityFeed.userId, user.id),
        eq(activityFeed.type, "chat"),
        gte(activityFeed.createdAt, new Date(Date.now() - 60_000))
      )
    );
  if (recent.n >= 10) return { error: "Rustig aan — max 10 berichten per minuut." };

  let resolvedParentId: string | null = null;
  let parentAuthorId: string | null = null;
  if (parentId) {
    const parent = await db.query.activityFeed.findFirst({
      where: eq(activityFeed.id, parentId),
      columns: { id: true, challengeId: true, parentId: true, userId: true },
    });
    if (!parent || parent.challengeId !== challengeId) return { error: "Bericht niet gevonden." };
    resolvedParentId = parent.parentId ?? parent.id;
    parentAuthorId = parent.userId;
  }

  await db.insert(activityFeed).values({
    challengeId,
    userId: user.id,
    type: "chat",
    payload: { text },
    parentId: resolvedParentId,
  });

  // Let the thread starter know someone replied — unless they replied to
  // themselves.
  if (parentAuthorId && parentAuthorId !== user.id) {
    const me = await db.query.profiles.findFirst({
      where: (p, { eq: eqOp }) => eqOp(p.id, user.id),
      columns: { username: true },
    });
    await createNotification({
      userId: parentAuthorId,
      type: "feed_reply",
      payload: { username: me?.username ?? null, text: text.slice(0, 80) },
    });
  }

  revalidatePath("/app");
  return { ok: true };
}
