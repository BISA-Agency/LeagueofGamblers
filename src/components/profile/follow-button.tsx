"use client";

import { useTransition } from "react";
import { toggleFollow } from "@/actions/follows";
import { Button } from "@/components/ui/button";

export function FollowButton({
  targetUserId,
  targetUsername,
  isFollowing,
}: {
  targetUserId: string;
  targetUsername: string;
  isFollowing: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant={isFollowing ? "outline" : "default"}
      disabled={pending}
      className="h-11"
      onClick={() => startTransition(() => toggleFollow(targetUserId, targetUsername))}
    >
      {isFollowing ? "Ontvolgen" : "Volgen"}
    </Button>
  );
}
