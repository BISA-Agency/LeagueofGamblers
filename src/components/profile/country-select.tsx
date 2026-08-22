"use client";

import { COUNTRY_OPTIONS } from "@/lib/countries";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CountrySelect({ defaultValue }: { defaultValue?: string | null }) {
  return (
    <div className="space-y-2">
      <Label htmlFor="country">Land</Label>
      <Select name="country" defaultValue={defaultValue ?? undefined}>
        <SelectTrigger id="country" className="h-11 w-full">
          <SelectValue placeholder="Kies je land (optioneel)" />
        </SelectTrigger>
        <SelectContent>
          {COUNTRY_OPTIONS.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              {c.flag} {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">De vlag komt achter je gebruikersnaam.</p>
    </div>
  );
}
