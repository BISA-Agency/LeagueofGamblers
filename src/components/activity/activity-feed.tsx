import { desc, eq, isNull, and, inArray } from "drizzle-orm";
import { formatActivityMessage } from "@/lib/activity/format";
import { db } from "@/lib/db";
import { activityFeed } from "@drizzle/schema";
import { FeedComposer } from "./feed-composer";
import { FeedItem, type FeedReply } from "./feed-item";

/**
 * The challenge timeline (§home/threads): system events and chat messages in
 * one stream, each with an optional thread of replies underneath.
 */
export async function ActivityFeed({
  challengeId,
  currentUserId,
  limit = 30,
}: {
  challengeId: string;
  currentUserId: string;
  limit?: number;
}) {
  const entries = await db.query.activityFeed.findMany({
    where: and(eq(activityFeed.challengeId, challengeId), isNull(activityFeed.parentId)),
    orderBy: desc(activityFeed.createdAt),
    limit,
    with: { user: true, reactions: true },
  });

  const replies =
    entries.length > 0
      ? await db.query.activityFeed.findMany({
          where: inArray(
            activityFeed.parentId,
            entries.map((e) => e.id)
          ),
          orderBy: (f, { asc }) => asc(f.createdAt),
          with: { user: true },
        })
      : [];

  const repliesByParent = new Map<string, FeedReply[]>();
  for (const reply of replies) {
    const list = repliesByParent.get(reply.parentId!) ?? [];
    list.push({
      id: reply.id,
      username: reply.user?.username ?? "?",
      avatarUrl: reply.user?.avatarUrl ?? null,
      text: String((reply.payload as { text?: string }).text ?? ""),
      createdAt: reply.createdAt,
    });
    repliesByParent.set(reply.parentId!, list);
  }

  return (
    <div className="space-y-3">
      <FeedComposer challengeId={challengeId} />

      {entries.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nog geen activiteit — plaats een bet of zeg iets tegen het veld.
        </p>
      )}

      {entries.map((entry) => {
        const reactionCounts: Record<string, number> = {};
        const myReactions = new Set<string>();
        for (const r of entry.reactions) {
          reactionCounts[r.emoji] = (reactionCounts[r.emoji] ?? 0) + 1;
          if (r.userId === currentUserId) myReactions.add(r.emoji);
        }

        const isChat = entry.type === "chat";

        return (
          <FeedItem
            key={entry.id}
            feedId={entry.id}
            challengeId={challengeId}
            kind={isChat ? "chat" : "system"}
            username={entry.user?.username ?? null}
            avatarUrl={entry.user?.avatarUrl ?? null}
            message={
              isChat
                ? String((entry.payload as { text?: string }).text ?? "")
                : formatActivityMessage(entry, entry.user?.username ?? null)
            }
            createdAt={entry.createdAt}
            reactionCounts={reactionCounts}
            myReactions={myReactions}
            replies={repliesByParent.get(entry.id) ?? []}
          />
        );
      })}
    </div>
  );
}
