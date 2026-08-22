"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { completeOnboarding, type OnboardingState } from "@/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CountrySelect } from "@/components/profile/country-select";
import { GeneratedAvatar } from "@/components/profile/generated-avatar";

const initialState: OnboardingState = {};

export function OnboardingForm({
  defaultFavoriteClub,
  defaultFavoriteSport,
}: {
  defaultFavoriteClub: string;
  defaultFavoriteSport: string;
}) {
  const [state, formAction, pending] = useActionState(completeOnboarding, initialState);
  const [username, setUsername] = useState("");

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Welkom bij League of Gamblers</h1>
        <p className="text-sm text-muted-foreground">Kies een gebruikersnaam om te beginnen.</p>
      </div>

      <div className="flex justify-center">
        <GeneratedAvatar username={username || "?"} size={64} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="username">Gebruikersnaam</Label>
        <Input
          id="username"
          name="username"
          placeholder="bijv. mo_sharp"
          required
          minLength={3}
          maxLength={24}
          pattern="[a-z0-9_]+"
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
          className="h-11"
        />
        <p className="text-xs text-muted-foreground">
          3–24 tekens: kleine letters, cijfers en underscore (_). Niet meer wijzigbaar zodra
          je in een lopende challenge zit.
        </p>
        {state.fieldErrors?.username && (
          <p role="alert" className="text-sm text-loss">
            {state.fieldErrors.username}
          </p>
        )}
      </div>

      <CountrySelect />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="favoriteClub">Favoriete club</Label>
          <Input
            id="favoriteClub"
            name="favoriteClub"
            defaultValue={defaultFavoriteClub}
            placeholder="Optioneel"
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="favoriteSport">Favoriete sport</Label>
          <Input
            id="favoriteSport"
            name="favoriteSport"
            defaultValue={defaultFavoriteSport}
            placeholder="Optioneel"
            className="h-11"
          />
        </div>
      </div>

      <div className="space-y-3 rounded-lg bg-secondary/50 p-4 text-sm">
        <p className="font-medium">In het kort</p>
        <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
          <li>Je speelt met virtueel geld — de app verwerkt zelf geen echt geld.</li>
          <li>Iedereen start met hetzelfde saldo; wie aan het einde het hoogst staat wint de pot.</li>
          <li>
            Odds in het sportsbook staan een week vast. Wed je buiten het sportsbook om, dan
            heb je een screenshot nodig als bewijs.
          </li>
          <li>Vals spelen (nep-screenshots, bets na aanvang) leidt tot sancties.</li>
        </ul>
        <Link
          href="/rules"
          target="_blank"
          className="inline-block text-accent-brand underline underline-offset-2"
        >
          Lees de volledige spelregels
        </Link>
      </div>

      <div className="flex items-start gap-3">
        <Checkbox id="rulesAccepted" name="rulesAccepted" required className="mt-0.5" />
        <Label htmlFor="rulesAccepted" className="text-sm font-normal leading-snug">
          Ik heb de spelregels gelezen en begrepen.
        </Label>
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-loss">
          {state.error}
        </p>
      )}

      <Button type="submit" className="h-11 w-full" disabled={pending}>
        {pending ? "Bezig…" : "Aan de slag"}
      </Button>
    </form>
  );
}
