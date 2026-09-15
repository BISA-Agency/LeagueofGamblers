"use client";

import { useActionState, useState } from "react";
import { createChallenge, type CreateChallengeState } from "@/actions/admin/challenges";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: CreateChallengeState = {};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function NewChallengeForm() {
  const [state, formAction, pending] = useActionState(createChallenge, initialState);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="name">Naam</Label>
        <Input
          id="name"
          name="name"
          required
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
          className="h-11"
        />
        {state.fieldErrors?.name && <p className="text-sm text-loss">{state.fieldErrors.name}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">Slug (voor /c/…)</Label>
        <Input
          id="slug"
          name="slug"
          required
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(slugify(e.target.value));
          }}
          className="h-11"
        />
        {state.fieldErrors?.slug && <p className="text-sm text-loss">{state.fieldErrors.slug}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="descriptionMd">Omschrijving (markdown, optioneel)</Label>
        <Textarea id="descriptionMd" name="descriptionMd" rows={4} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startAt">Start (Europe/Amsterdam)</Label>
          <Input id="startAt" name="startAt" type="datetime-local" required className="h-11" />
          {state.fieldErrors?.startAt && (
            <p className="text-sm text-loss">{state.fieldErrors.startAt}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="endAt">Einde (Europe/Amsterdam)</Label>
          <Input id="endAt" name="endAt" type="datetime-local" required className="h-11" />
          {state.fieldErrors?.endAt && (
            <p className="text-sm text-loss">{state.fieldErrors.endAt}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startingBalance">Startsaldo (€)</Label>
          <Input
            id="startingBalance"
            name="startingBalance"
            type="number"
            min={1}
            step="0.01"
            defaultValue={10000}
            className="h-11 tabular-nums"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="buyInAmount">Inleg (€)</Label>
          <Input
            id="buyInAmount"
            name="buyInAmount"
            type="number"
            min={0}
            step="0.01"
            defaultValue={100}
            className="h-11 tabular-nums"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxPlayers">Max spelers</Label>
          <Input
            id="maxPlayers"
            name="maxPlayers"
            type="number"
            min={2}
            placeholder="Onbeperkt"
            className="h-11 tabular-nums"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="durationType">Duur-type</Label>
          <select
            id="durationType"
            name="durationType"
            defaultValue="custom"
            className="h-11 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="week">Week</option>
            <option value="month">Maand</option>
            <option value="season">Seizoen</option>
            <option value="custom">Aangepast</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="prizeMode">Prijsmodus</Label>
          <select
            id="prizeMode"
            name="prizeMode"
            defaultValue="standard"
            className="h-11 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="standard">Standaard</option>
            <option value="hardcore">Hardcore (winner takes all)</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="lateJoinDays">Late-join dagen (0 = uit)</Label>
        <Input
          id="lateJoinDays"
          name="lateJoinDays"
          type="number"
          min={0}
          defaultValue={0}
          className="h-11 max-w-32 tabular-nums"
        />
        <p className="text-xs text-muted-foreground">
          Aantal dagen na de startdatum waarin nog gejoined mag worden, ook als de challenge al bezig is.
        </p>
      </div>

      <div className="space-y-2">
        <label className="flex min-h-9 items-center gap-2 text-sm">
          <Checkbox name="bountyEnabled" />
          Bounty mode aan
        </label>
        <Label htmlFor="bountyPerPlayer">Bounty per speler (€)</Label>
        <Input
          id="bountyPerPlayer"
          name="bountyPerPlayer"
          type="number"
          min={0}
          step="0.01"
          defaultValue={0}
          className="h-11 max-w-32 tabular-nums"
        />
        {state.fieldErrors?.bountyPerPlayer && (
          <p className="text-sm text-loss">{state.fieldErrors.bountyPerPlayer}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Wordt uit de inleg gehaald (moet lager zijn dan de inleg) en per bust real-money uitgekeerd aan
          wie de bounty-voorspelling wint.
        </p>
      </div>

      {state.error && <p className="text-sm text-loss">{state.error}</p>}

      <Button type="submit" className="h-11 w-full" disabled={pending}>
        {pending ? "Aanmaken…" : "Challenge aanmaken (als concept)"}
      </Button>
    </form>
  );
}
