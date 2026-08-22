import type { Metadata } from "next";
import Link from "next/link";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { BetOfTheDay } from "@/components/activity/bet-of-the-day";
import { Countdown } from "@/components/challenges/countdown";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getActiveParticipation } from "@/lib/challenges/active";
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

  // `active` is the challenge the header switcher points at; it drives the
  // timeline. Other participations show as compact links underneath.
  const { active, all: participations } = await getActiveParticipation(user.id);
  const activeParticipation = active?.status === "active" ? active : null;
  const otherParticipations = participations.filter(
    (p) => p.challengeId !== active?.challengeId
  );

  if (participations.length === 0) {
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

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-6">
      {active && (
        <div className="rounded-lg border border-border p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                href={`/app/challenge/${active.challenge.slug}`}
                className="text-lg font-semibold tracking-tight hover:underline"
              >
                {active.challenge.name}
              </Link>
              {active.status === "active" ? (
                <p className="text-sm text-muted-foreground">
                  Saldo{" "}
                  <span className="font-medium tabular-nums text-foreground">
                    €{money.format(active.balance)}
                  </span>
                </p>
              ) : active.paidBuyIn ? (
                <p className="text-sm text-muted-foreground">Nog niet gestart</p>
              ) : (
                <p className="text-sm text-muted-foreground">Je inleg is nog niet geregistreerd</p>
              )}
            </div>
            <div className="shrink-0 text-right">
              {active.status === "active" && (
                <Countdown label="Nog" target={active.challenge.endAt.toISOString()} />
              )}
              <Link
                href="/app/bets"
                className="text-xs text-muted-foreground underline underline-offset-2"
              >
                Mijn bets
              </Link>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button asChild variant="outline" size="sm" className="h-11">
              <Link href="/app/sportsbook">Sportsbook</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-11">
              <Link href="/app/bets/proof">Bewijsbet</Link>
            </Button>
          </div>
        </div>
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

      {activeParticipation && (
        <>
          <BetOfTheDay challengeId={activeParticipation.challengeId} />
          <section className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">Het veld</h2>
            <ActivityFeed challengeId={activeParticipation.challengeId} currentUserId={user.id} />
          </section>
        </>
      )}
    </div>
  );
}
