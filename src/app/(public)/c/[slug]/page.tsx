import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { challengeParticipants, challenges } from "@drizzle/schema";

const dateFormatter = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Amsterdam",
});

export default async function PublicChallengePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const challenge = await db.query.challenges.findFirst({ where: eq(challenges.slug, slug) });
  if (!challenge) notFound();

  const participants = await db.query.challengeParticipants.findMany({
    where: eq(challengeParticipants.challengeId, challenge.id),
  });
  const paidCount = participants.filter((p) => p.paidBuyIn).length;
  const pot = paidCount * challenge.buyInAmount;

  return (
    <main className="mx-auto max-w-xl px-6 py-14">
      <p className="text-sm font-medium text-accent-brand">League of Gamblers</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{challenge.name}</h1>
      <p className="mt-2 text-muted-foreground">
        {dateFormatter.format(challenge.startAt)} – {dateFormatter.format(challenge.endAt)}
      </p>

      {challenge.descriptionMd && (
        <p className="mt-6 whitespace-pre-wrap text-sm">{challenge.descriptionMd}</p>
      )}

      <div className="mt-8 grid grid-cols-3 gap-4 rounded-lg border border-border p-4 text-sm">
        <div>
          <p className="text-muted-foreground">Spelers</p>
          <p className="text-lg font-semibold tabular-nums">{participants.length}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Inleg</p>
          <p className="text-lg font-semibold tabular-nums">
            €{challenge.buyInAmount.toLocaleString("nl-NL")}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Pot (betaald)</p>
          <p className="text-lg font-semibold tabular-nums text-profit">
            €{pot.toLocaleString("nl-NL")}
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg" className="h-11">
          <Link href="/login?next=/app/challenges">Doe mee</Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-11">
          <Link href="/rules">Spelregels</Link>
        </Button>
      </div>
    </main>
  );
}
