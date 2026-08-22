"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DEFAULT_SPORT_KEYS, DEFAULT_SPORT_LABELS } from "@/lib/odds-provider/sports";
import { updateChallengeSportsbookSettings } from "@/actions/admin/challenge-settings";

const MARKET_OPTIONS: { value: string; label: string }[] = [
  { value: "h2h", label: "1X2 / Moneyline" },
  { value: "totals", label: "Over/Under" },
  { value: "spreads", label: "Handicap" },
];

export function SportsbookSettingsForm({
  challengeId,
  defaultSportKeys,
  defaultMarkets,
  defaultAutoPublish,
}: {
  challengeId: string;
  defaultSportKeys: string[];
  defaultMarkets: string[];
  defaultAutoPublish: boolean;
}) {
  const action = updateChallengeSportsbookSettings.bind(null, challengeId);

  return (
    <form action={action} className="space-y-6">
      <div className="space-y-2">
        <Label>Sporten</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Object.entries(DEFAULT_SPORT_KEYS).map(([key, apiKey]) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <Checkbox
                name="sportKeys"
                value={apiKey}
                defaultChecked={defaultSportKeys.includes(apiKey)}
              />
              {DEFAULT_SPORT_LABELS[key]}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Markten</Label>
        <div className="flex gap-4">
          {MARKET_OPTIONS.map((m) => (
            <label key={m.value} className="flex items-center gap-2 text-sm">
              <Checkbox
                name="marketTypes"
                value={m.value}
                defaultChecked={defaultMarkets.includes(m.value)}
              />
              {m.label}
            </label>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox name="autoPublishImports" defaultChecked={defaultAutoPublish} />
        Wekelijkse import automatisch publiceren (zonder preview te bekijken)
      </label>

      <Button type="submit" size="sm" className="h-11">
        Opslaan
      </Button>
    </form>
  );
}
