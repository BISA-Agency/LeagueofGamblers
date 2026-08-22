import { desc, eq } from "drizzle-orm";
import { formatActivityMessage } from "@/lib/activity/format";
import { db } from "@/lib/db";
import { activityFeed } from "@drizzle/schema";
import { FeedItem } from "./feed-item";

export async function ActivityFeed({
  challengeId,
  currentUserId,
  limit = 20,
}: {
  challengeId: string;
  currentUserId: string;
  limit?: number;
}) {
  const entries = await db.query.activityFeed.findMany({
    where: eq(activityFeed.challengeId, challengeId),
    orderBy: desc(activityFeed.createdAt),
    limit,
    with: { user: true, reactions: true },
  });

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Nog geen activiteit.</p>;
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const reactionCounts: Record<string, number> = {};
        const myReactions = new Set<string>();
        for (const r of entry.reactions) {
          reactionCounts[r.emoji] = (reactionCounts[r.emoji] ?? 0) + 1;
          if (r.userId === currentUserId) myReactions.add(r.emoji);
        }

        return (
          <FeedItem
            key={entry.id}
            feedId={entry.id}
            message={formatActivityMessage(entry, entry.user?.username ?? null)}
            createdAt={entry.createdAt}
            reactionCounts={reactionCounts}
            myReactions={myReactions}
          />
        );
      })}
    </div>
  );
}
