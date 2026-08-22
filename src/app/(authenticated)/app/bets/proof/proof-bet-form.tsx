"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createProofBet, type ProofBetState } from "@/actions/proof-bets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const initialState: ProofBetState = {};

const BOOKMAKERS = [
  { value: "toto", label: "Toto" },
  { value: "unibet", label: "Unibet" },
  { value: "bet365", label: "Bet365" },
  { value: "holland_casino", label: "Holland Casino" },
  { value: "jacks", label: "Jack's" },
  { value: "betcity", label: "BetCity" },
  { value: "overig", label: "Overig" },
];

export function ProofBetForm({ challengeId }: { challengeId: string }) {
  const action = createProofBet.bind(null, challengeId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [selectionCount, setSelectionCount] = useState(1);

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sport">Sport</Label>
          <Input id="sport" name="sport" placeholder="bijv. Voetbal" required className="h-11" />
          {state.fieldErrors?.sport && <p className="text-sm text-loss">{state.fieldErrors.sport}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="competition">Competitie (optioneel)</Label>
          <Input id="competition" name="competition" className="h-11" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bookmaker">Bookmaker</Label>
        <Select name="bookmaker" required>
          <SelectTrigger id="bookmaker" className="h-11 w-full">
            <SelectValue placeholder="Kies een bookmaker" />
          </SelectTrigger>
          <SelectContent>
            {BOOKMAKERS.map((b) => (
              <SelectItem key={b.value} value={b.value}>
                {b.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <Label>Selecties {selectionCount > 1 && "(combi)"}</Label>
        {Array.from({ length: selectionCount }).map((_, i) => (
          <div key={i} className="space-y-2 rounded-md border border-border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Selectie {i + 1}</span>
              {selectionCount > 1 && (
                <button
                  type="button"
                  onClick={() => setSelectionCount((c) => c - 1)}
                  className="text-muted-foreground hover:text-loss"
                  aria-label="Verwijder selectie"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
            <Input name="eventName" placeholder="Wedstrijd / event" required className="h-11" />
            <div className="grid grid-cols-2 gap-2">
              <Input name="eventStart" type="datetime-local" required className="h-11" />
              <Input name="odds" type="number" step="0.01" min="1.01" placeholder="Odds" required className="h-11 tabular-nums" />
            </div>
            <Input name="marketLabel" placeholder="Markt (bijv. Doelpuntenmaker)" required className="h-11" />
            <Input name="selectionLabel" placeholder="Jouw selectie" required className="h-11" />
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => setSelectionCount((c) => c + 1)}>
          <Plus className="size-4" /> Selectie toevoegen
        </Button>
        {state.error && <p className="text-sm text-loss">{state.error}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="stake">Inzet (€)</Label>
        <Input id="stake" name="stake" type="number" step="0.01" min="0.01" required className="h-11 tabular-nums" />
        {state.fieldErrors?.stake && <p className="text-sm text-loss">{state.fieldErrors.stake}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="screenshot">Screenshot van de bet slip</Label>
        <Input id="screenshot" name="screenshot" type="file" accept="image/jpeg,image/png,image/webp,image/heic" required className="h-11" />
        {state.fieldErrors?.screenshot && (
          <p className="text-sm text-loss">{state.fieldErrors.screenshot}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">Notitie (optioneel, max 140 tekens)</Label>
        <Textarea id="note" name="note" maxLength={140} rows={2} />
      </div>

      <Button type="submit" className="h-11 w-full" disabled={pending}>
        {pending ? "Bezig…" : "Bewijsbet plaatsen"}
      </Button>
    </form>
  );
}
