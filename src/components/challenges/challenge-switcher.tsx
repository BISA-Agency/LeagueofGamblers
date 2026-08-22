"use client";

import { useTransition } from "react";
import { setActiveChallenge } from "@/actions/active-challenge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ChallengeSwitcher({
  challenges,
  activeId,
}: {
  challenges: { id: string; name: string }[];
  activeId: string;
}) {
  const [pending, startTransition] = useTransition();

  // Nothing to switch between — don't take up header space.
  if (challenges.length < 2) return null;

  return (
    <Select
      value={activeId}
      disabled={pending}
      onValueChange={(id) => startTransition(() => setActiveChallenge(id))}
    >
      <SelectTrigger className="h-9 max-w-44 text-xs" aria-label="Actieve challenge">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {challenges.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
