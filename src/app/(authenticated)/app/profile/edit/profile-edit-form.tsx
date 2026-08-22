"use client";

import { useActionState } from "react";
import { updateProfile, type ProfileEditState } from "@/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: ProfileEditState = {};

export function ProfileEditForm({
  defaultValues,
}: {
  defaultValues: { bio: string; statusText: string; favoriteClub: string; favoriteSport: string };
}) {
  const [state, formAction, pending] = useActionState(updateProfile, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="statusText">Status (trash talk)</Label>
        <Input
          id="statusText"
          name="statusText"
          maxLength={60}
          defaultValue={defaultValues.statusText}
          placeholder="bijv. Op weg naar de top"
          className="h-11"
        />
        {state.fieldErrors?.statusText && (
          <p className="text-sm text-loss">{state.fieldErrors.statusText}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea id="bio" name="bio" maxLength={160} defaultValue={defaultValues.bio} rows={3} />
        {state.fieldErrors?.bio && <p className="text-sm text-loss">{state.fieldErrors.bio}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="favoriteClub">Favoriete club</Label>
          <Input
            id="favoriteClub"
            name="favoriteClub"
            defaultValue={defaultValues.favoriteClub}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="favoriteSport">Favoriete sport</Label>
          <Input
            id="favoriteSport"
            name="favoriteSport"
            defaultValue={defaultValues.favoriteSport}
            className="h-11"
          />
        </div>
      </div>

      {state.error && <p className="text-sm text-loss">{state.error}</p>}

      <Button type="submit" className="h-11 w-full" disabled={pending}>
        {pending ? "Opslaan…" : "Opslaan"}
      </Button>
    </form>
  );
}
