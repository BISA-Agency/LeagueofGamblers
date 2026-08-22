import { inArray } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { requireCronSecret } from "@/lib/cron-auth";
import { db } from "@/lib/db";
import { createImportPreview, publishImportRow } from "@/lib/odds-provider/run-import";
import { challenges } from "@drizzle/schema";

/**
 * Odds import (§5.3) — Vercel Cron default: Monday 08:00 UTC for the main
 * weekly run, everyone gets that one. The optional Thursday mini-import
 * hits this same route with ?midweek=1, which narrows the run to only
 * challenges that opted into midweekImportEnabled.
 */
export async function GET(request: NextRequest) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  const isMidweekRun = request.nextUrl.searchParams.get("midweek") === "1";

  const activeChallenges = await db.query.challenges.findMany({
    where: inArray(challenges.status, ["open", "live"]),
  });

  const results: { challengeId: string; importId: string; published: boolean; error?: string }[] = [];

  for (const challenge of activeChallenges) {
    if (challenge.sportKeys.length === 0) continue;
    if (isMidweekRun && !challenge.midweekImportEnabled) continue;
    try {
      const { importRow } = await createImportPreview(challenge.id, null);
      let published = false;
      if (challenge.autoPublishImports) {
        await publishImportRow(importRow.id);
        published = true;
      }
      results.push({ challengeId: challenge.id, importId: importRow.id, published });
    } catch (err) {
      results.push({
        challengeId: challenge.id,
        importId: "",
        published: false,
        error: err instanceof Error ? err.message : "Onbekende fout",
      });
    }
  }

  return NextResponse.json({ results });
}
