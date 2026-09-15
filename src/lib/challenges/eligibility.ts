import type { Challenge } from "@drizzle/schema";

const DAY_MS = 86_400_000;

/**
 * Whether a player may still join — either before the challenge starts, or
 * within its late-join grace window after it has already gone live.
 */
export function canJoinChallenge(
  challenge: Pick<Challenge, "status" | "startAt" | "lateJoinDays">,
  now = new Date()
): boolean {
  if (challenge.status === "open") return true;
  if (challenge.status !== "live") return false;
  if (challenge.lateJoinDays <= 0) return false;

  const deadline = challenge.startAt.getTime() + challenge.lateJoinDays * DAY_MS;
  return now.getTime() <= deadline;
}
