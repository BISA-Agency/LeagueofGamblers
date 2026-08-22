import { NextResponse, type NextRequest } from "next/server";
import { requireCronSecret } from "@/lib/cron-auth";
import { runDailyRankSnapshots } from "@/lib/challenges/rank-snapshots";

/**
 * Daily rank/balance snapshot (§5.5) — Vercel Cron default: 00:05 Europe/Amsterdam.
 * Also sends every ranked player their daily rank-update notification.
 */
export async function GET(request: NextRequest) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  const result = await runDailyRankSnapshots();
  return NextResponse.json(result);
}
