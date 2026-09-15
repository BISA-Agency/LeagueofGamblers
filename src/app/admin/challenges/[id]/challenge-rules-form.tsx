"use client";

import { useActionState } from "react";
import { updateChallengeRules, type SettingsState } from "@/actions/admin/challenge-settings";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SaveBar } from "./save-bar";

export function ChallengeRulesForm({
  challengeId,
  defaultMissionBudget,
  defaultMissionsFromPot,
  defaultAllowRebuy,
  defaultDurationType,
  defaultPrizeMode,
  defaultLateJoinDays,
  defaultBountyEnabled,
  defaultBountyPerPlayer,
}: {
  challengeId: string;
  defaultMissionBudget: number;
  defaultMissionsFromPot: boolean;
  defaultAllowRebuy: boolean;
  defaultDurationType: "week" | "month" | "season" | "custom";
  defaultPrizeMode: "standard" | "hardcore";
  defaultLateJoinDays: number;
  defaultBountyEnabled: boolean;
  defaultBountyPerPlayer: number;
}) {
  const [state, action] = useActionState<SettingsState, FormData>(
    updateChallengeRules.bind(null, challengeId),
    {}
  );

  return (
    <form action={action} className="space-y-4">
      <div className="max-w-48 space-y-2">
        <Label htmlFor="missionBudget">Missiebudget (€)</Label>
        <Input
          id="missionBudget"
          name="missionBudget"
          type="number"
          min={0}
          step="0.01"
          defaultValue={defaultMissionBudget}
          className="h-11 tabular-nums"
        />
        <p className="text-xs text-muted-foreground">
          Harde bovengrens voor missie-uitkeringen in deze challenge. Is het op, dan krijgen spelers nog wel
          XP en badges, maar geen geld meer.
        </p>
      </div>

      <label className="flex min-h-9 items-center gap-2 text-sm">
        <Checkbox name="missionsFromPot" defaultChecked={defaultMissionsFromPot} />
        Missiebudget uit de pot (de prijzenpot wordt met dit bedrag verlaagd; uit = jij betaalt het bovenop de
        pot)
      </label>

      <label className="flex min-h-9 items-center gap-2 text-sm">
        <Checkbox name="allowRebuy" defaultChecked={defaultAllowRebuy} />
        Rebuy toestaan (een speler die bust is mag opnieuw inleggen)
      </label>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="durationType">Duur-type</Label>
          <select
            id="durationType"
            name="durationType"
            defaultValue={defaultDurationType}
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
            defaultValue={defaultPrizeMode}
            className="h-11 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="standard">Standaard</option>
            <option value="hardcore">Hardcore (winner takes all)</option>
          </select>
        </div>
      </div>

      <div className="max-w-48 space-y-2">
        <Label htmlFor="lateJoinDays">Late-join dagen (0 = uit)</Label>
        <Input
          id="lateJoinDays"
          name="lateJoinDays"
          type="number"
          min={0}
          defaultValue={defaultLateJoinDays}
          className="h-11 tabular-nums"
        />
      </div>

      <div className="space-y-2">
        <label className="flex min-h-9 items-center gap-2 text-sm">
          <Checkbox name="bountyEnabled" defaultChecked={defaultBountyEnabled} />
          Bounty mode aan
        </label>
        <div className="max-w-48 space-y-2">
          <Label htmlFor="bountyPerPlayer">Bounty per speler (€)</Label>
          <Input
            id="bountyPerPlayer"
            name="bountyPerPlayer"
            type="number"
            min={0}
            step="0.01"
            defaultValue={defaultBountyPerPlayer}
            className="h-11 tabular-nums"
          />
        </div>
      </div>

      {state.error && <p className="text-sm text-loss">{state.error}</p>}
      <SaveBar label="Spelregels opslaan" saved={Boolean(state.saved)} />
    </form>
  );
}
