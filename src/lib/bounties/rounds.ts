import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { matchDayFor } from "@/lib/predictions/daily";
import { bountyRoundMatches, bountyRounds, challenges, events } from "@drizzle/schema";
import { pickRandomMatches } from "./pick-matches";

const DAY_MS = 86_400_000;

/**
 * Candidate fixtures for a bounty round: this challenge's own events, plus
 * any shared ones (challengeId null — the hook the future shared-sportsbook
 * refactor will start using), upcoming, with both teams known, and starting
 * on the next Amsterdam calendar day.
 */
async function candidateMatches(challengeId: string, now: Date) {
  const tomorrow = matchDayFor(new Date(now.getTime() + DAY_MS));

  const rows = await db.query.events.findMany({
    where: and(
      or(eq(events.challengeId, challengeId), isNull(events.challengeId)),
      eq(events.status, "upcoming")
    ),
  });

  return rows.filter((e) => e.homeTeam && e.awayTeam && matchDayFor(e.startsAt) === tomorrow);
}

/**
 * Spins up a bounty round for a bust, if the challenge has bounty mode on.
 * Called from checkAndMarkBust() right after a participant is marked bust.
 */
export async function createBountyRoundIfEnabled(
  challengeId: string,
  bustedUserId: string,
  now = new Date()
): Promise<string | null> {
  const challenge = await db.query.challenges.findFirst({
    where: eq(challenges.id, challengeId),
    columns: { bountyEnabled: true, bountyPerPlayer: true },
  });
  if (!challenge?.bountyEnabled) return null;

  const candidates = await candidateMatches(challengeId, now);
  const matches = pickRandomMatches(candidates, 5);
  if (matches.length === 0) return null;

  return db.transaction(async (tx) => {
    const [round] = await tx
      .insert(bountyRounds)
      .values({ challengeId, bustedUserId, payoutAmount: challenge.bountyPerPlayer })
      .returning({ id: bountyRounds.id });

    await tx
      .insert(bountyRoundMatches)
      .values(matches.map((m) => ({ bountyRoundId: round.id, eventId: m.id })));

    return round.id;
  });
}
