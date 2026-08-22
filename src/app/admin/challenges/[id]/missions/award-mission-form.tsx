"use client";

import { useState, useTransition } from "react";
import { awardMissionManually } from "@/actions/admin/missions";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function AwardMissionForm({
  missionId,
  challengeId,
  players,
}: {
  missionId: string;
  challengeId: string;
  players: { userId: string; username: string }[];
}) {
  const [userId, setUserId] = useState<string>("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function award() {
    if (!userId) {
      setError("Kies een speler.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await awardMissionManually(missionId, userId, challengeId);
        setDone(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Toekennen mislukt.");
      }
    });
  }

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
      <Button type="button" size="sm" variant="outline" className="h-9" disabled={pending} onClick={award}>
        Toekennen
      </Button>
      {done && <span className="text-xs text-profit">Toegekend</span>}
      {error && <span className="text-xs text-loss">{error}</span>}
    </div>
  );
}
