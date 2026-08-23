"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Long crypto strings get copied, not typed. This is the primary control on
 * the payment screen — the QR below it exists only for people paying from a
 * different device than the one they are reading on.
 */
export function CopyField({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-1">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex items-stretch gap-1.5">
        <code
          className={cn(
            "min-w-0 flex-1 break-all rounded-md border border-border bg-secondary/40 px-2.5 py-2 text-xs",
            mono && "font-mono"
          )}
        >
          {value}
        </code>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(value).then(
              () => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              },
              () => setCopied(false)
            );
          }}
          aria-label={`${label} kopiëren`}
          className={cn(
            "flex w-11 shrink-0 items-center justify-center rounded-md border transition-colors",
            copied ? "border-profit/40 bg-profit/15 text-profit" : "border-border hover:bg-secondary/60"
          )}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </button>
      </div>
    </div>
  );
}
