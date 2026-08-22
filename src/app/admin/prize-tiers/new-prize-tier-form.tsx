"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createPrizeTier, type CreatePrizeTierState } from "@/actions/admin/prize-tiers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: CreatePrizeTierState = {};

export function NewPrizeTierForm() {
  const [state, formAction, pending] = useActionState(createPrizeTier, initialState);
  const [rankCount, setRankCount] = useState(3);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="minPlayers">Min. spelers</Label>
          <Input id="minPlayers" name="minPlayers" type="number" min="2" required className="h-11 tabular-nums" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxPlayers">Max. spelers</Label>
          <Input id="maxPlayers" name="maxPlayers" type="number" min="2" placeholder="Onbeperkt" className="h-11 tabular-nums" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="label">Label</Label>
          <Input id="label" name="label" placeholder="bijv. 7-15 spelers" required className="h-11" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Verdeling (moet optellen tot 100%)</Label>
        {Array.from({ length: rankCount }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-6 text-sm text-muted-foreground">#{i + 1}</span>
            <input type="hidden" name="rank" value={i + 1} />
            <Input name="percent" type="number" step="0.1" min="0" max="100" placeholder="%" required className="h-11 tabular-nums" />
            {rankCount > 1 && (
              <Button type="button" variant="ghost" size="icon" className="h-11 w-11 shrink-0" onClick={() => setRankCount((c) => c - 1)}>
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => setRankCount((c) => c + 1)}>
          <Plus className="size-4" /> Plaats toevoegen
        </Button>
      </div>

      {state.error && <p className="text-sm text-loss">{state.error}</p>}
      <Button type="submit" className="h-11 w-full" disabled={pending}>
        {pending ? "Aanmaken…" : "Staffel toevoegen"}
      </Button>
    </form>
  );
}
