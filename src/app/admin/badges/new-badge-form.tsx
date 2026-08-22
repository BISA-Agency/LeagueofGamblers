"use client";

import { useActionState } from "react";
import { createBadge, type CreateBadgeState } from "@/actions/admin/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BADGE_ICONS } from "@/components/badges/badge-icon";

const initialState: CreateBadgeState = {};

export function NewBadgeForm() {
  const [state, formAction, pending] = useActionState(createBadge, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Naam</Label>
        <Input id="name" name="name" required className="h-11" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Omschrijving</Label>
        <Textarea id="description" name="description" required rows={2} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="icon">Icoon</Label>
          <Select name="icon" defaultValue="trophy">
            <SelectTrigger id="icon" className="h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(BADGE_ICONS).map((key) => (
                <SelectItem key={key} value={key}>
                  {key}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="rarity">Zeldzaamheid</Label>
          <Select name="rarity" defaultValue="common">
            <SelectTrigger id="rarity" className="h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="common">Common</SelectItem>
              <SelectItem value="rare">Rare</SelectItem>
              <SelectItem value="epic">Epic</SelectItem>
              <SelectItem value="legendary">Legendary</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {state.error && <p className="text-sm text-loss">{state.error}</p>}
      <Button type="submit" className="h-11 w-full" disabled={pending}>
        {pending ? "Aanmaken…" : "Badge aanmaken"}
      </Button>
    </form>
  );
}
