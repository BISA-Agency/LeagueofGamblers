"use client";

import { useTransition } from "react";
import { toggleReaction } from "@/actions/activity";
import { cn } from "@/lib/utils";

const REACTION_EMOJI = ["🔥", "😂", "🫡", "🤡", "💀"];

const timeFormatter = new Intl.DateTimeFormat("nl-NL", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Amsterdam",
});

export function FeedItem({
  feedId,
  message,
  createdAt,
  reactionCounts,
  myReactions,
}: {
  feedId: string;
  message: string;
  createdAt: Date;
  reactionCounts: Record<string, number>;
  myReactions: Set<string>;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm">{message}</p>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {timeFormatter.format(createdAt)}
        </span>
      </div>
      <div className="mt-2 flex gap-1">
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
      </div>
    </div>
  );
}
