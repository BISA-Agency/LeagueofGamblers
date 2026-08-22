"use client";

import { useActionState, useState } from "react";
import { createMission, type CreateMissionState } from "@/actions/admin/missions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MISSION_TYPE_OPTIONS } from "@/lib/missions/admin-fields";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const initialState: CreateMissionState = {};

/** challengeId null = League of Gamblers-missie: XP-only, dus zonder geldveld
 * en zonder de tijdgebonden types die een challenge-saldo nodig hebben. */
export function NewMissionForm({ challengeId }: { challengeId: string | null }) {
  const isGeneral = challengeId === null;
  const typeOptions = MISSION_TYPE_OPTIONS.filter((t) => !isGeneral || !t.challengeOnly);
  const action = createMission.bind(null, challengeId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [type, setType] = useState(typeOptions[0].value);
  const selectedType = typeOptions.find((t) => t.value === type)!;

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
            {typeOptions.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {selectedType.params.length > 0 && (
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selectedType.params.length}, 1fr)` }}>
          {selectedType.params.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={`param_${field.key}`}>{field.label}</Label>
              <Input
                id={`param_${field.key}`}
                name={`param_${field.key}`}
                type={field.type === "number" ? "number" : "text"}
                step={field.type === "number" ? "0.01" : undefined}
                required
                className="h-11 tabular-nums"
              />
            </div>
          ))}
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
      <div className={isGeneral ? "grid grid-cols-2 gap-4" : "grid grid-cols-3 gap-4"}>
        {!isGeneral && (
          <div className="space-y-2">
            <Label htmlFor="rewardAmount">Geldprijs (€)</Label>
            <Input id="rewardAmount" name="rewardAmount" type="number" step="0.01" min="0" className="h-11 tabular-nums" />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="rewardXp">XP</Label>
          <Input id="rewardXp" name="rewardXp" type="number" min="0" className="h-11 tabular-nums" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxWinners">Max winnaars</Label>
          <Input id="maxWinners" name="maxWinners" type="number" min="1" placeholder="Onbeperkt" className="h-11 tabular-nums" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="validFrom">Loopt vanaf</Label>
          <Input id="validFrom" name="validFrom" type="datetime-local" className="h-11" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="validTo">Loopt tot</Label>
          <Input id="validTo" name="validTo" type="datetime-local" className="h-11" />
        </div>
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">
        Zet een einddatum om er een weekmissie van te maken; leeg laten betekent doorlopend.
      </p>
      <div className="flex gap-4">
        <label className="flex min-h-9 items-center gap-2 text-sm">
          <Checkbox name="repeatable" /> Herhaalbaar
        </label>
        <label className="flex min-h-9 items-center gap-2 text-sm">
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
