"use client";

import { useActionState, useState } from "react";
import { createMission, type CreateMissionState } from "@/actions/admin/missions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const initialState: CreateMissionState = {};

const TYPES = [
  { value: "win_odds_min", label: "Win met minimale odds", paramLabel: "Minimale odds (bijv. 20)" },
  { value: "win_streak", label: "Winstreak", paramLabel: "Aantal op rij (bijv. 5)" },
  { value: "combi_win", label: "Combi winnen", paramLabel: "Minimaal aantal selecties (bijv. 4)" },
  { value: "manual", label: "Handmatig (admin kent toe)", paramLabel: null },
];

export function NewMissionForm({ challengeId }: { challengeId: string }) {
  const action = createMission.bind(null, challengeId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [type, setType] = useState("win_odds_min");
  const selectedType = TYPES.find((t) => t.value === type)!;

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Titel</Label>
        <Input id="title" name="title" required className="h-11" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Omschrijving</Label>
        <Textarea id="description" name="description" required rows={2} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="type">Type</Label>
        <Select name="type" value={type} onValueChange={setType}>
          <SelectTrigger id="type" className="h-11 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {selectedType.paramLabel && (
        <div className="space-y-2">
          <Label htmlFor="paramValue">{selectedType.paramLabel}</Label>
          <Input id="paramValue" name="paramValue" type="number" step="0.01" required className="h-11 tabular-nums" />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="appliesTo">Telt voor</Label>
        <Select name="appliesTo" defaultValue="both">
          <SelectTrigger id="appliesTo" className="h-11 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="both">Sportsbook + bewijsbet</SelectItem>
            <SelectItem value="sportsbook">Alleen sportsbook</SelectItem>
            <SelectItem value="proof">Alleen bewijsbet</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="rewardAmount">Geldprijs (€)</Label>
          <Input id="rewardAmount" name="rewardAmount" type="number" step="0.01" min="0" className="h-11 tabular-nums" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rewardXp">XP</Label>
          <Input id="rewardXp" name="rewardXp" type="number" min="0" className="h-11 tabular-nums" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxWinners">Max winnaars</Label>
          <Input id="maxWinners" name="maxWinners" type="number" min="1" placeholder="Onbeperkt" className="h-11 tabular-nums" />
        </div>
      </div>
      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox name="repeatable" /> Herhaalbaar
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox name="hidden" /> Verborgen (secret)
        </label>
      </div>
      {state.error && <p className="text-sm text-loss">{state.error}</p>}
      <Button type="submit" className="h-11 w-full" disabled={pending}>
        {pending ? "Aanmaken…" : "Missie aanmaken"}
      </Button>
    </form>
  );
}
