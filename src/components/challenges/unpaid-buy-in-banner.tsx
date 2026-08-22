import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/lib/db";
import { challengeParticipants } from "@drizzle/schema";

/**
 * Only paid players get a balance and count for the pot (§5.2), so someone
 * who joined but hasn't paid would otherwise just see an empty app with no
 * explanation.
 */
export async function UnpaidBuyInBanner({ userId }: { userId: string }) {
  const unpaid = await db.query.challengeParticipants.findMany({
    where: and(
      eq(challengeParticipants.userId, userId),
      eq(challengeParticipants.paidBuyIn, false)
    ),
    with: { challenge: true },
  });

  const relevant = unpaid.filter((p) =>
    (["open", "live"] as string[]).includes(p.challenge.status)
  );
  if (relevant.length === 0) return null;

  return (
    <div className="border-b border-accent-brand/30 bg-accent-brand/10 px-4 py-2.5">
      <p className="mx-auto max-w-2xl text-sm">
        Je inleg voor{" "}
        <span className="font-medium">
          {relevant.map((p) => p.challenge.name).join(", ")}
        </span>{" "}
        is nog niet geregistreerd — je doet nog niet mee om de pot en kunt nog niet wedden.{" "}
        <Link href="/app/pay" className="text-accent-brand underline underline-offset-2">
          Hoe betaal ik?
        </Link>
      </p>
    </div>
  );
}
