"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ComparePicker({
  usernames,
  a,
  b,
}: {
  usernames: string[];
  a: string;
  b: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const go = (next: { a?: string; b?: string }) => {
    const params = new URLSearchParams({ a: next.a ?? a, b: next.b ?? b });
    startTransition(() => router.push(`/app/compare?${params}`));
  };

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <Select value={a} onValueChange={(v) => go({ a: v })} disabled={pending}>
        <SelectTrigger className="h-11 w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {usernames.map((u) => (
            <SelectItem key={u} value={u} disabled={u === b}>
              {u}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="text-xs font-medium text-muted-foreground">vs</span>

      <Select value={b} onValueChange={(v) => go({ b: v })} disabled={pending}>
        <SelectTrigger className="h-11 w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {usernames.map((u) => (
            <SelectItem key={u} value={u} disabled={u === a}>
              {u}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
