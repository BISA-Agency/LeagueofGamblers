"use client";

import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { toggleReaction } from "@/actions/activity";
import { UserAvatar } from "@/components/profile/user-avatar";
import { cn } from "@/lib/utils";
import { FeedComposer } from "./feed-composer";

const REACTION_EMOJI = ["🔥", "😂", "🫡", "🤡", "💀"];

const timeFormatter = new Intl.DateTimeFormat("nl-NL", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Amsterdam",
});

export type FeedReply = {
  id: string;
  username: string;
  avatarUrl: string | null;
  text: string;
  createdAt: Date;
};

export function FeedItem({
  feedId,
  challengeId,
  kind,
  username,
  avatarUrl,
  message,
  createdAt,
  reactionCounts,
  myReactions,
  replies,
  slip,
}: {
  feedId: string;
  challengeId: string;
  kind: "system" | "chat";
  username: string | null;
  avatarUrl: string | null;
  message: string;
  createdAt: Date;
  reactionCounts: Record<string, number>;
  myReactions: Set<string>;
  replies: FeedReply[];
  /** Rendered server-side so a sealed bet's details never reach the client. */
  slip?: ReactNode;
}) {
  const [pending, startTransition] = useTransition();
  // Threads open automatically once they have content; otherwise on demand.
  const [threadOpen, setThreadOpen] = useState(false);
  const showThread = threadOpen || replies.length > 0;

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-start gap-2.5">
        {kind === "chat" && username && (
          <UserAvatar username={username} avatarUrl={avatarUrl} size={28} />
        )}
        <div className="min-w-0 flex-1">
          {kind === "chat" && username && (
            <Link
              href={`/app/profile/${username}`}
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              {username}
            </Link>
          )}
          <p className={cn("text-sm", kind === "chat" && "break-words")}>{message}</p>
          {slip}
        </div>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {timeFormatter.format(createdAt)}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-1">
        {REACTION_EMOJI.map((emoji) => {
          const count = reactionCounts[emoji] ?? 0;
          const active = myReactions.has(emoji);
          return (
            <button
              key={emoji}
              type="button"
              disabled={pending}
              onClick={() => startTransition(() => toggleReaction(feedId, emoji))}
              className={cn(
                "flex h-7 min-w-7 items-center justify-center gap-1 rounded-full border px-1.5 text-xs transition-colors",
                active ? "border-accent-brand bg-accent-brand/10" : "border-border hover:bg-secondary/50"
              )}
            >
              {emoji}
              {count > 0 && <span className="tabular-nums text-muted-foreground">{count}</span>}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setThreadOpen((v) => !v)}
          className={cn(
            "ml-1 flex h-7 items-center gap-1 rounded-full border border-border px-2 text-xs transition-colors hover:bg-secondary/50",
            replies.length > 0 && "text-foreground"
          )}
        >
          <MessageCircle className="size-3.5" />
          {replies.length > 0 ? replies.length : "Reageer"}
        </button>
      </div>

      {showThread && (
        <div className="mt-3 space-y-2 border-l-2 border-border/60 pl-3">
          {replies.map((reply) => (
            <div key={reply.id} className="flex items-start gap-2">
              <UserAvatar username={reply.username} avatarUrl={reply.avatarUrl} size={22} />
              <div className="min-w-0 flex-1">
                <p className="text-xs">
                  <Link
                    href={`/app/profile/${reply.username}`}
                    className="font-medium text-muted-foreground hover:text-foreground"
                  >
                    {reply.username}
                  </Link>{" "}
                  <span className="tabular-nums text-muted-foreground/60">
                    {timeFormatter.format(reply.createdAt)}
                  </span>
                </p>
                <p className="break-words text-sm">{reply.text}</p>
              </div>
            </div>
          ))}
          <FeedComposer
            challengeId={challengeId}
            parentId={feedId}
            placeholder="Reageer…"
            autoFocus={threadOpen && replies.length === 0}
          />
        </div>
      )}
    </div>
  );
}
