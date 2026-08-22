import { NextResponse, type NextRequest } from "next/server";
import { requireCronSecret } from "@/lib/cron-auth";
import { runLiveToSettlingTransitions, runOpenToLiveTransitions } from "@/lib/challenges/lifecycle";

export async function GET(request: NextRequest) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  const wentLive = await runOpenToLiveTransitions();
  const wentSettling = await runLiveToSettlingTransitions();

  return NextResponse.json({ wentLive, wentSettling });
}
