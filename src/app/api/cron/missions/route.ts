import { NextResponse, type NextRequest } from "next/server";
import { requireCronSecret } from "@/lib/cron-auth";
import { evaluateTimeBoundMissions } from "@/lib/missions/evaluate-time-bound";

/**
 * Daily time-bound mission evaluation (profit_day/profit_week/survive/
 * volume) — must run *after* /api/cron/snapshots so "today" is already in
 * each player's rank_snapshots history.
 */
export async function GET(request: NextRequest) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  const evaluated = await evaluateTimeBoundMissions();
  return NextResponse.json({ evaluated });
}
