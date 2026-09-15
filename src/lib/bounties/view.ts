import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { bountyRounds } from "@drizzle/schema";

export type BountyRoundMatchView = {
  bountyRoundMatchId: string;
  name: string;
  homeTeam: string | null;
  awayTeam: string | null;
  startsAt: Date;
  open: boolean;
  mine: { homeGoals: number; awayGoals: number } | null;
};

export type BountyRoundView = {
  bountyRoundId: string;
  bustedUsername: string;
  payoutAmount: number;
  matches: BountyRoundMatchView[];
};

/** Every bounty round still collecting predictions for this challenge, with this player's own guesses where they've made one. */
export async function getActiveBountyRounds(
  challengeId: string,
  userId: string
): Promise<BountyRoundView[]> {
  const rounds = await db.query.bountyRounds.findMany({
    where: and(eq(bountyRounds.challengeId, challengeId), eq(bountyRounds.status, "collecting")),
    with: {
      bustedUser: { columns: { username: true } },
      matches: {
        with: {
          event: true,
          predictions: { where: (p, { eq }) => eq(p.userId, userId) },
        },
      },
    },
    orderBy: (r, { desc }) => desc(r.createdAt),
  });

  const now = new Date();
  return rounds.map((round) => ({
    bountyRoundId: round.id,
    bustedUsername: round.bustedUser.username,
    payoutAmount: round.payoutAmount,
    matches: round.matches.map((m) => ({
      bountyRoundMatchId: m.id,
      name: m.event.name,
      homeTeam: m.event.homeTeam,
      awayTeam: m.event.awayTeam,
      startsAt: m.event.startsAt,
      open: m.event.startsAt > now && m.event.status === "upcoming",
      mine: m.predictions[0]
        ? { homeGoals: m.predictions[0].homeGoals, awayGoals: m.predictions[0].awayGoals }
        : null,
    })),
  }));
}
