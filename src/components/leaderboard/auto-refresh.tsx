"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Polling fallback for live updates (§5.5) — refetches the server component every 30s. */
export function LeaderboardAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 30_000);
    return () => clearInterval(interval);
  }, [router]);

  return null;
}
