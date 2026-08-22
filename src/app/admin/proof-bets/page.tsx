import { asc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getProofScreenshotSignedUrl } from "@/lib/storage/screenshots";
import { bets } from "@drizzle/schema";
import { ProofBetQueueCard } from "./proof-bet-queue-card";

export const metadata: Metadata = { title: "Bewijsbetten controleren" };

export default async function AdminProofBetsPage() {
  const pending = await db.query.bets.findMany({
    where: eq(bets.verificationStatus, "pending"),
    orderBy: asc(bets.placedAt),
    with: { selections: true, user: true },
  });

  const withUrls = await Promise.all(
    pending.map(async (bet) => ({
      bet,
      screenshotUrl: bet.screenshotUrl
        ? await getProofScreenshotSignedUrl(bet.screenshotUrl)
        : null,
    }))
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Bewijsbetten controleren</h1>
        <p className="text-sm text-muted-foreground">{pending.length} in de wachtrij</p>
      </div>

      {pending.length === 0 && (
        <p className="text-sm text-muted-foreground">Niets te controleren.</p>
      )}

      <div className="space-y-4">
        {withUrls.map(({ bet, screenshotUrl }) => (
          <ProofBetQueueCard
            key={bet.id}
            bet={bet}
            username={bet.user.username}
            screenshotUrl={screenshotUrl}
          />
        ))}
      </div>
    </div>
  );
}
