"use client";

import { useEffect, useState } from "react";

function formatRemaining(ms: number): string {
  if (ms <= 0) return "afgelopen";
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (days > 0) return `${days}d ${hours}u`;
  if (hours > 0) return `${hours}u ${minutes}m`;
  return `${minutes}m`;
}

export function Countdown({ label, target }: { label: string; target: string }) {
  // Server and client will render a slightly different "now" — that's
  // expected for a clock, so the dynamic bit is marked to skip the
  // hydration-mismatch warning rather than delaying the first paint.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const remaining = new Date(target).getTime() - now;

  return (
    <p className="text-xs text-muted-foreground">
      {label}{" "}
      <span className="tabular-nums font-medium text-foreground" suppressHydrationWarning>
        {formatRemaining(remaining)}
      </span>
    </p>
  );
}
