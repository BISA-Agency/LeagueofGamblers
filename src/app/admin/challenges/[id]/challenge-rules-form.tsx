"use client";

import { updateChallengeRules } from "@/actions/admin/challenge-settings";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChallengeRulesForm({
  challengeId,
  defaultMissionBudget,
  defaultAllowRebuy,
}: {
  challengeId: string;
  defaultMissionBudget: number;
  defaultAllowRebuy: boolean;
}) {
  const action = updateChallengeRules.bind(null, challengeId);

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
          Het bedrag dat je apart houdt voor missie-uitkeringen. Puur administratief — het
          wordt niet automatisch van de pot afgetrokken.
        </p>
      </div>

      <label className="flex min-h-9 items-center gap-2 text-sm">
        <Checkbox name="allowRebuy" defaultChecked={defaultAllowRebuy} />
        Rebuy toestaan (een speler die bust is mag opnieuw inleggen)
      </label>

      <Button type="submit" size="sm" className="h-11">
        Opslaan
      </Button>
    </form>
  );
}
