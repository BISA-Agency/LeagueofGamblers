import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChallengeStatsPanel } from "@/components/challenges/challenge-stats";
import { UserAvatar } from "@/components/profile/user-avatar";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { getChallengeStats } from "@/lib/challenges/stats";
import { totalWithFee } from "@/lib/payments/rate";
import type { PrizeTierRow } from "@/lib/settlement/payouts";
import { challengeParticipants, challenges } from "@drizzle/schema";

const dateFormatter = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Amsterdam",
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const challenge = await db.query.challenges.findFirst({ where: eq(challenges.slug, slug) });
  if (!challenge) return { title: "Challenge" };

  const description = `Inleg €${challenge.buyInAmount.toLocaleString("nl-NL")} · ${dateFormatter.format(challenge.startAt)} – ${dateFormatter.format(challenge.endAt)}`;
  const images = [`/api/og/leaderboard/${challenge.id}`];

  return {
    title: challenge.name,
    description,
    openGraph: { title: challenge.name, description, images },
    twitter: { card: "summary_large_image", title: challenge.name, description, images },
  };
}

export default async function PublicChallengePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const challenge = await db.query.challenges.findFirst({ where: eq(challenges.slug, slug) });
  if (!challenge) notFound();

  const [participants, prizeTierRows] = await Promise.all([
    db.query.challengeParticipants.findMany({
      where: eq(challengeParticipants.challengeId, challenge.id),
      with: { user: { columns: { username: true, avatarUrl: true, country: true } } },
    }),
    db.query.prizeTiers.findMany(),
  ]);
  const stats = getChallengeStats(challenge, participants, prizeTierRows as PrizeTierRow[]);
  const { fee, total } = totalWithFee(challenge.buyInAmount, challenge.platformFeePercent);

  return (
    <main className="mx-auto max-w-xl px-6 py-14">
      <p className="text-sm font-medium text-accent-brand">League of Gamblers</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance">{challenge.name}</h1>
      <p className="mt-2 tabular-nums text-muted-foreground">
        {dateFormatter.format(challenge.startAt)} – {dateFormatter.format(challenge.endAt)}
      </p>

      {challenge.descriptionMd && (
        <p className="mt-6 whitespace-pre-wrap text-sm text-muted-foreground text-pretty">
          {challenge.descriptionMd}
        </p>
      )}

      <ChallengeStatsPanel stats={stats} buyIn={challenge.buyInAmount} className="mt-8" />

      {participants.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {participants.slice(0, 10).map((p) => (
            <span
              key={p.userId}
              className="flex items-center gap-1.5 rounded-full border border-border py-1 pl-1 pr-2.5 text-xs"
            >
              <UserAvatar username={p.user.username} avatarUrl={p.user.avatarUrl} size={20} />
              {p.user.username}
            </span>
          ))}
          {participants.length > 10 && (
            <span className="text-xs text-muted-foreground">
              +{participants.length - 10} anderen
            </span>
          )}
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg" className="h-12 text-base">
          <Link href={`/login?next=${encodeURIComponent("/app/challenges")}`}>
            Doe mee voor €{challenge.buyInAmount.toLocaleString("nl-NL")}
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-12 text-base">
          <Link href="/rules">Spelregels</Link>
        </Button>
      </div>

      {/* What it costs, said here rather than first on /app/pay: this is the
          page a shared link lands on, and the fee should not be a surprise
          waiting behind the join button. */}
      <p className="mt-4 text-xs text-muted-foreground">
        Je speelt met €{challenge.startingBalance.toLocaleString("nl-NL")} virtueel geld. De
        inleg van €{challenge.buyInAmount.toLocaleString("nl-NL")} gaat volledig in de pot
        {fee > 0 ? (
          <>
            ; daar komt {challenge.platformFeePercent}% servicekosten bovenop, dus je betaalt{" "}
            €{total.toLocaleString("nl-NL")}
          </>
        ) : null}
        . Betalen doe je in USDT, in de app.
      </p>
    </main>
  );
}
