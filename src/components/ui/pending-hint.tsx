"use client";

import { useLinkStatus } from "next/link";
import { cn } from "@/lib/utils";

/**
 * Marks the link you just pressed while its page is on its way.
 *
 * Two different gaps need this, and a route-level skeleton closes neither:
 *
 * - A tab whose loading skeleton hasn't been prefetched yet, which on a phone
 *   on a bad connection is exactly when it hasn't.
 * - A filter that only changes the query string. React deliberately keeps the
 *   old screen on-screen during that transition instead of falling back to the
 *   skeleton — good, no flash, but measured at five to nine seconds on a
 *   throttled connection with nothing at all to show for the tap.
 *
 * Must be rendered inside a <Link>: the hook reads the status of the nearest
 * one above it. Give it a fixed size and position it absolutely, so it can
 * never push the layout around when it appears.
 *
 * The 120ms delay lives in CSS (.pending-hint in globals.css), so a navigation
 * that lands quickly finishes before anything becomes visible.
 */
export function PendingHint({ className }: { className?: string }) {
  const { pending } = useLinkStatus();

  return (
    <span
      aria-hidden
      data-pending={pending}
      className={cn("pending-hint pointer-events-none absolute", className)}
    />
  );
}
