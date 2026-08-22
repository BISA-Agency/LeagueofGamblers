"use client";

import { useState, useTransition } from "react";
import { savePrediction } from "@/actions/predictions";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function PredictionPicker({
  challengeId,
  players,
  current,
}: {
  challengeId: string;
  players: { userId: string; username: string }[];
  current: string | null;
}) {
  const [picked, setPicked] = useState(current ?? "");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={picked}
        onValueChange={(v) => {
          setPicked(v);
          setSaved(false);
        }}
      >
        <SelectTrigger className="h-11 min-w-48 flex-1">
          <SelectValue placeholder="Kies wie er wint" />
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
        className="h-11"
        disabled={pending || !picked || picked === current}
        onClick={() =>
          startTransition(async () => {
            await savePrediction(challengeId, picked);
            setSaved(true);
          })
        }
      >
        {current ? "Wijzigen" : "Vastleggen"}
      </Button>
      {saved && <span className="text-xs text-profit">Opgeslagen</span>}
    </div>
  );
}
