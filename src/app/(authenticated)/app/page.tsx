import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { BetOfTheDay } from "@/components/activity/bet-of-the-day";
import { ChallengeStatsPanel } from "@/components/challenges/challenge-stats";
import { Countdown } from "@/components/challenges/countdown";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getActiveParticipation } from "@/lib/challenges/active";
import { displayBalance, getChallengeStats, hasStarted } from "@/lib/challenges/stats";
import { db } from "@/lib/db";
import type { PrizeTierRow } from "@/lib/settlement/payouts";
import { challengeParticipants } from "@drizzle/schema";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Home" };

const money = new Intl.NumberFormat("nl-NL", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export default async function AppHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { active, all: participations } = await getActiveParticipation(user.id);

  if (!active) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <h1 className="text-xl font-semibold tracking-tight">Welkom bij League of Gamblers</h1>
        <Card>
          <CardHeader>
            <CardTitle>Je doet nog nergens aan mee</CardTitle>
            <CardDescription>
              Blader door de open challenges en doe mee met je vrienden.
            </CardDescription>
          </CardHeader>
          <div className="px-4 pb-4">
            <Button asChild className="h-11 w-full">
              <Link href="/app/challenges">Bekijk challenges</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const challenge = active.challenge;
  const started = hasStarted(challenge.status);

  const [participants, prizeTiers] = await Promise.all([
    db.query.challengeParticipants.findMany({
      where: eq(challengeParticipants.challengeId, challenge.id),
    }),
    db.query.prizeTiers.findMany(),
  ]);
  const stats = getChallengeStats(challenge, participants, prizeTiers as PrizeTierRow[]);

  const otherParticipations = participations.filter((p) => p.challengeId !== active.challengeId);

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-6">
      {/* Your own position first: balance if playing, countdown if not yet. */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={`/app/challenge/${challenge.slug}`}
              className="text-lg font-semibold tracking-tight hover:underline"
            >
              {challenge.name}
            </Link>
            {!active.paidBuyIn ? (
              <p className="text-sm text-loss">Je inleg is nog niet geregistreerd</p>
            ) : started ? (
              <p className="text-sm text-muted-foreground">
                Jouw saldo{" "}
                <span className="font-medium tabular-nums text-foreground">
                  €{money.format(displayBalance(active, challenge))}
                </span>
              </p>
            ) : (
              <p className="text-sm text-profit">Je staat aan de start</p>
            )}
          </div>
          <div className="shrink-0 text-right">
            <Countdown
              label={started ? "Nog" : "Begint over"}
              target={(started ? challenge.endAt : challenge.startAt).toISOString()}
            />
            <Link
              href="/app/bets"
              className="text-xs text-muted-foreground underline underline-offset-2"
            >
              Mijn bets
            </Link>
          </div>
        </div>

        {started && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button asChild variant="outline" size="sm" className="h-11">
              <Link href="/app/sportsbook">Sportsbook</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-11">
              <Link href="/app/bets/proof">Bewijsbet</Link>
            </Button>
          </div>
        )}
      </div>

      <ChallengeStatsPanel stats={stats} buyIn={challenge.buyInAmount} />

      {!started && (
        <p className="text-center text-xs text-muted-foreground">
          Wedden kan zodra de challenge begint. Tot die tijd: praat vast met het veld hieronder.
        </p>
      )}

      {otherParticipations.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Ook actief in:{" "}
          {otherParticipations.map((p, i) => (
            <span key={p.challengeId}>
              {i > 0 && ", "}
              <Link
                href={`/app/challenge/${p.challenge.slug}`}
                className="underline underline-offset-2 hover:text-foreground"
              >
                {p.challenge.name}
              </Link>
            </span>
          ))}{" "}
          — wissel via de kiezer bovenin.
        </p>
      )}

      {started && <BetOfTheDay challengeId={challenge.id} />}

      {/* The feed runs from the moment you join, not from kickoff — the weeks
          before the start are half the fun. */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Het veld</h2>
        <ActivityFeed challengeId={challenge.id} currentUserId={user.id} />
      </section>
    </div>
  );
}
