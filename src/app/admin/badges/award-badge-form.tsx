"use client";

import { useState, useTransition } from "react";
import { awardBadgeManually } from "@/actions/admin/badges";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function AwardBadgeForm({
  badgeId,
  players,
}: {
  badgeId: string;
  players: { userId: string; username: string }[];
}) {
  const [userId, setUserId] = useState("");
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={userId} onValueChange={setUserId}>
        <SelectTrigger className="h-9 w-40">
          <SelectValue placeholder="Kies speler" />
        </SelectTrigger>
        <SelectContent>
          {players.map((p) => (
            <SelectItem key={p.userId} value={p.userId}>
              {p.username}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-9"
        disabled={pending || !userId}
        onClick={() =>
          startTransition(async () => {
            await awardBadgeManually(badgeId, userId, null);
            setDone(true);
          })
        }
      >
        Toekennen
      </Button>
      {done && <span className="text-xs text-profit">Toegekend</span>}
    </div>
  );
}
