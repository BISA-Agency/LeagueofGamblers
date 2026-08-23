import { desc, eq, isNull, and, inArray } from "drizzle-orm";
import { formatActivityMessage } from "@/lib/activity/format";
import { db } from "@/lib/db";
import { activityFeed, bets } from "@drizzle/schema";
import { FeedBetSlip, type FeedBetSlipData } from "./feed-bet-slip";
import { FeedComposer } from "./feed-composer";
import { FeedItem, type FeedReply } from "./feed-item";

const BET_TYPES = new Set(["bet_placed", "bet_won", "bet_lost"]);

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

  // Slips referenced by the feed. Older rows predate the betId payload, so a
  // missing bet just means no slip — the sentence still stands on its own.
  const betIds = [
    ...new Set(
      entries
        .filter((e) => BET_TYPES.has(e.type))
        .map((e) => (e.payload as { betId?: string }).betId)
        .filter((id): id is string => typeof id === "string")
    ),
  ];

  const betRows =
    betIds.length > 0
      ? await db.query.bets.findMany({
          where: inArray(bets.id, betIds),
          with: { selections: true },
        })
      : [];

  const now = new Date();
  const slipsByBetId = new Map<string, FeedBetSlipData>();
  for (const bet of betRows) {
    // Same gate as /app/bets/field: someone else's pick stays sealed until
    // its earliest event kicks off. Hidden slips are built without any
    // selection label or odds, so nothing leaks into the HTML.
    const revealed = bet.userId === currentUserId || bet.eventStart <= now;
    slipsByBetId.set(
      bet.id,
      revealed
        ? {
            revealed: true,
            betId: bet.id,
            stake: bet.stake,
            legCount: bet.selections.length,
            status: bet.status as "open" | "won" | "lost" | "void",
            totalOdds: bet.totalOdds,
            potentialPayout: bet.potentialPayout,
            legs: bet.selections.map((s) => ({
              id: s.id,
              eventName: s.eventName,
              selectionLabel: s.selectionLabel,
              marketLabel: s.marketLabel,
              odds: s.odds,
              result: s.result,
            })),
          }
        : {
            revealed: false,
            betId: bet.id,
            stake: bet.stake,
            legCount: bet.selections.length,
            kickoff: bet.eventStart,
          }
    );
  }

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
        const betId = (entry.payload as { betId?: string }).betId;
        const slip = betId ? slipsByBetId.get(betId) : undefined;

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
            slip={slip ? <FeedBetSlip slip={slip} /> : null}
          />
        );
      })}
    </div>
  );
}
