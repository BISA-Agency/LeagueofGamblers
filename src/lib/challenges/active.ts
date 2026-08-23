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

/**
 * How long a finished challenge stays in the header switcher. Long enough to
 * look back at the final standings, short enough that the list doesn't grow
 * by one every month. The full history never disappears — it lives on the
 * profile (§erelijst) and on /app/challenges.
 */
export const FINISHED_VISIBLE_DAYS = 3;

/** Whether a participation still belongs in the switcher. */
export function isSwitchable(p: ParticipationWithChallenge, now: Date): boolean {
  if (p.challenge.status !== "finished") return true;
  return now.getTime() - p.challenge.endAt.getTime() < FINISHED_VISIBLE_DAYS * 86_400_000;
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
  /** Everything the player has ever joined, most relevant first. */
  all: ParticipationWithChallenge[];
  /** What the switcher offers: `all` minus challenges that finished over
   *  {@link FINISHED_VISIBLE_DAYS} days ago. */
  switchable: ParticipationWithChallenge[];
}> {
  const all = await getParticipations(userId);
  if (all.length === 0) return { active: null, all, switchable: [] };

  const now = new Date();
  const switchable = all.filter((p) => isSwitchable(p, now));

  const cookieStore = await cookies();
  const preferredId = cookieStore.get(ACTIVE_CHALLENGE_COOKIE)?.value;
  // A pick only counts while that challenge is still on offer — otherwise a
  // player who last opened the app during August would be stuck in August
  // forever, looking at a finished board.
  const preferred = preferredId
    ? switchable.find((p) => p.challengeId === preferredId)
    : undefined;

  const active = preferred ?? switchable[0] ?? all[0];

  // The active challenge is always listed, even once it has aged out — the
  // switcher must be able to name what you're looking at.
  return {
    active,
    all,
    switchable: switchable.includes(active) ? switchable : [active, ...switchable],
  };
}
