import { db } from "@/lib/db";
import { apiUsage } from "@drizzle/schema";
import type { UsageInfo } from "./types";

export type ApiEndpoint = "odds" | "event_odds" | "scores";

/**
 * Records what a provider call cost.
 *
 * Kept out of the provider itself so that stays a pure HTTP client, and never
 * allowed to throw: a bookkeeping row is not worth failing an import or a
 * settlement run over. A call that reports no usage at all is skipped rather
 * than stored as a zero, which would read as "this was free".
 */
export async function recordApiUsage(
  endpoint: ApiEndpoint,
  usage: UsageInfo,
  sportKey?: string
): Promise<void> {
  if (usage.creditsUsed === null) return;
  try {
    await db.insert(apiUsage).values({
      endpoint,
      creditsUsed: usage.creditsUsed,
      creditsRemaining: usage.creditsRemaining,
      sportKey: sportKey ?? null,
    });
  } catch (err) {
    console.error(
      "[api-usage] vastleggen van verbruik mislukt:",
      err instanceof Error ? err.message : err
    );
  }
}
