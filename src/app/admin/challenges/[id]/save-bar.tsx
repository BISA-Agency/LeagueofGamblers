"use client";

import { useFormStatus } from "react-dom";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Saving used to give no sign it had happened, which is how a form whose
 * selection went nowhere looked exactly like one that worked. This says both
 * halves: what is being saved, and that it was.
 *
 * The label matters as much as the confirmation. Two buttons on this page both
 * said "Opslaan", with a long collapsed list of competitions between them, so
 * ticking sports and hitting the nearer button quietly saved the other form.
 */
export function SaveBar({ label, saved }: { label: string; saved: boolean }) {
  const { pending } = useFormStatus();

  return (
    <div className="flex items-center gap-3">
      <Button type="submit" size="sm" className="h-11" disabled={pending}>
        {pending ? "Bezig…" : label}
      </Button>
      {saved && !pending && (
        <span className="flex items-center gap-1.5 text-xs font-medium text-profit">
          <Check className="size-3.5" /> Opgeslagen
        </span>
      )}
    </div>
  );
}
