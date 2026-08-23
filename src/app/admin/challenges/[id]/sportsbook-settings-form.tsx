"use client";

import { useActionState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { SPORT_GROUP_LABELS } from "@/lib/odds-provider/sports";
import type { SportGroup } from "@/lib/odds-provider/available-sports";
import {
  updateChallengeSportsbookSettings,
  type SettingsState,
} from "@/actions/admin/challenge-settings";
import { SaveBar } from "./save-bar";

// Featured markets come free with the bulk call. The additional ones cost one
// request per event, so the form says so rather than letting an admin quietly
// multiply the weekly credit bill.
const MARKET_OPTIONS: { value: string; label: string; hint?: string }[] = [
  { value: "h2h", label: "1X2 / Moneyline" },
  { value: "totals", label: "Over/Under" },
  { value: "spreads", label: "Handicap" },
  { value: "team_totals", label: "Team totaal", hint: "extra credits" },
  { value: "btts", label: "Beide teams scoren", hint: "extra credits" },
  { value: "double_chance", label: "Dubbele kans", hint: "extra credits" },
  { value: "draw_no_bet", label: "Draw no bet", hint: "extra credits" },
];

export function SportsbookSettingsForm({
  challengeId,
  sportGroups,
  liveSportList,
  defaultSportKeys,
  defaultMarkets,
  defaultAutoPublish,
  defaultMidweekImport,
}: {
  challengeId: string;
  sportGroups: SportGroup[];
  liveSportList: boolean;
  defaultSportKeys: string[];
  defaultMarkets: string[];
  defaultAutoPublish: boolean;
  defaultMidweekImport: boolean;
}) {
  const [state, action] = useActionState<SettingsState, FormData>(
    updateChallengeSportsbookSettings.bind(null, challengeId),
    {}
  );

  return (
    <form action={action} className="space-y-6">
      <div className="space-y-3">
        <div>
          <Label>Sporten</Label>
          <p className="text-xs text-muted-foreground">
            {liveSportList
              ? "Live lijst van de odds-provider. Buiten seizoen mag je alvast aanvinken — die competities komen vanzelf terug."
              : "Geen ODDS_API_KEY gevonden, dus dit is de standaardlijst. Zet de key en herlaad voor de echte competities."}{" "}
            Elke sport kost credits per import, dus kies gericht.
          </p>
        </div>

        {/* Collapsed by default: the live catalogue is ~175 competitions, and
            an admin usually only opens the one group they need. */}
        {sportGroups.map((group) => {
          const selectedInGroup = group.sports.filter((s) =>
            defaultSportKeys.includes(s.key)
          ).length;
          return (
            <details
              key={group.group}
              open={selectedInGroup > 0}
              className="rounded-md border border-border"
            >
              <summary className="flex min-h-11 cursor-pointer items-center justify-between px-3 text-sm font-medium">
                <span>{SPORT_GROUP_LABELS[group.group] ?? group.group}</span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {selectedInGroup > 0 ? `${selectedInGroup} gekozen` : `${group.sports.length}`}
                </span>
              </summary>
              <div className="grid grid-cols-1 gap-1 px-3 pb-3 sm:grid-cols-2">
                {group.sports.map((sport) => (
                  <label
                    key={sport.key}
                    className="flex min-h-9 items-center gap-2 text-sm"
                    title={sport.key}
                  >
                    <Checkbox
                      name="sportKeys"
                      value={sport.key}
                      defaultChecked={defaultSportKeys.includes(sport.key)}
                    />
                    <span className={sport.active ? "" : "text-muted-foreground"}>
                      {sport.title}
                      {!sport.active && " · buiten seizoen"}
                    </span>
                  </label>
                ))}
              </div>
            </details>
          );
        })}
      </div>

      <div className="space-y-2">
        <Label>Markten</Label>
        <div className="flex flex-wrap gap-4">
          {MARKET_OPTIONS.map((m) => (
            <label key={m.value} className="flex min-h-9 items-center gap-2 text-sm">
              <Checkbox
                name="marketTypes"
                value={m.value}
                defaultChecked={defaultMarkets.includes(m.value)}
              />
              {m.label}
              {m.hint && (
                <span className="text-xs text-muted-foreground">({m.hint})</span>
              )}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex min-h-9 items-center gap-2 text-sm">
          <Checkbox name="autoPublishImports" defaultChecked={defaultAutoPublish} />
          Wekelijkse import automatisch publiceren (zonder preview te bekijken)
        </label>

        <label className="flex min-h-9 items-center gap-2 text-sm">
          <Checkbox name="midweekImportEnabled" defaultChecked={defaultMidweekImport} />
          Extra midweek-import op donderdag (naast de maandagimport)
        </label>
      </div>

      <SaveBar label="Sporten & markten opslaan" saved={Boolean(state.saved)} />
    </form>
  );
}
