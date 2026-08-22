import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { challengeParticipants, type Challenge, type ChallengeParticipant } from "@drizzle/schema";

export const ACTIVE_CHALLENGE_COOKIE = "log_active_challenge";

export type ParticipationWithChallenge = ChallengeParticipant & { challenge: Challenge };

// Which challenge a player most likely means when they open the app: one
// they're playing beats one that hasn't started, which beats one that's over.
const STATUS_PRIORITY: Record<string, number> = {
  live: 0,
  open: 1,
  settling: 2,
  finished: 3,
  draft: 4,
};

function byRelevance(a: ParticipationWithChallenge, b: ParticipationWithChallenge) {
  const priority =
    (STATUS_PRIORITY[a.challenge.status] ?? 9) - (STATUS_PRIORITY[b.challenge.status] ?? 9);
  if (priority !== 0) return priority;
  return b.challenge.startAt.getTime() - a.challenge.startAt.getTime();
}

export async function getParticipations(userId: string): Promise<ParticipationWithChallenge[]> {
  const rows = await db.query.challengeParticipants.findMany({
    where: eq(challengeParticipants.userId, userId),
    with: { challenge: true },
  });
  return rows.sort(byRelevance);
}

/**
 * The challenge every "the active challenge" screen should read from. Falls
 * back to the most relevant one when the player hasn't picked, or picked a
 * challenge they're no longer in.
 */
export async function getActiveParticipation(userId: string): Promise<{
  active: ParticipationWithChallenge | null;
  all: ParticipationWithChallenge[];
}> {
  const all = await getParticipations(userId);
  if (all.length === 0) return { active: null, all };

  const cookieStore = await cookies();
  const preferredId = cookieStore.get(ACTIVE_CHALLENGE_COOKIE)?.value;
  const preferred = preferredId ? all.find((p) => p.challengeId === preferredId) : undefined;

  return { active: preferred ?? all[0], all };
}
