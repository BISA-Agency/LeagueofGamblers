"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createCustomEvent, type CreateCustomEventState } from "@/actions/admin/custom-events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: CreateCustomEventState = {};

export function NewCustomEventForm({ challengeId }: { challengeId: string }) {
  const action = createCustomEvent.bind(null, challengeId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [outcomeCount, setOutcomeCount] = useState(2);

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sportLabel">Sport/categorie</Label>
          <Input id="sportLabel" name="sportLabel" placeholder="bijv. UFC" required className="h-11" />
          {state.fieldErrors?.sportLabel && (
            <p className="text-sm text-loss">{state.fieldErrors.sportLabel}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="startsAt">Aanvangstijd</Label>
          <Input id="startsAt" name="startsAt" type="datetime-local" required className="h-11" />
          {state.fieldErrors?.startsAt && (
            <p className="text-sm text-loss">{state.fieldErrors.startsAt}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Naam van het event</Label>
        <Input id="name" name="name" placeholder="bijv. UFC 310: Hoofdgevecht" required className="h-11" />
        {state.fieldErrors?.name && <p className="text-sm text-loss">{state.fieldErrors.name}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="marketLabel">Markt</Label>
        <Input id="marketLabel" name="marketLabel" placeholder="bijv. Winnaar" required className="h-11" />
        {state.fieldErrors?.marketLabel && (
          <p className="text-sm text-loss">{state.fieldErrors.marketLabel}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Uitkomsten</Label>
        {Array.from({ length: outcomeCount }).map((_, i) => (
          <div key={i} className="flex gap-2">
            <Input name="outcomeLabel" placeholder="Naam" required className="h-11" />
            <Input
              name="outcomeOdds"
              type="number"
              step="0.01"
              min="1.01"
              placeholder="Odds"
              required
              className="h-11 w-28 tabular-nums"
            />
            {outcomeCount > 2 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-11 w-11 shrink-0"
                onClick={() => setOutcomeCount((c) => c - 1)}
                aria-label="Verwijder uitkomst"
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9"
          onClick={() => setOutcomeCount((c) => c + 1)}
        >
          <Plus className="size-4" /> Uitkomst toevoegen
        </Button>
        {state.error && <p className="text-sm text-loss">{state.error}</p>}
      </div>

      <Button type="submit" className="h-11 w-full" disabled={pending}>
        {pending ? "Aanmaken…" : "Event aanmaken"}
      </Button>
    </form>
  );
}
