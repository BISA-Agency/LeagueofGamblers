import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { Countdown } from "@/components/challenges/countdown";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { challengeParticipants } from "@drizzle/schema";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Home" };

export default async function AppHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const participations = await db.query.challengeParticipants.findMany({
    where: eq(challengeParticipants.userId, user.id),
    with: { challenge: true },
  });

  const activeParticipation = participations.find((p) => p.status === "active");

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Welkom terug</h1>
        <p className="text-sm text-muted-foreground">Hier zie je je saldo, rank en de laatste activiteit.</p>
      </div>

      {participations.length === 0 ? (
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
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Button asChild variant="outline" className="h-11">
              <Link href="/app/sportsbook">Sportsbook</Link>
            </Button>
            <Button asChild variant="outline" className="h-11">
              <Link href="/app/bets/proof">Bewijsbet</Link>
            </Button>
          </div>
          <div className="space-y-3">
            {participations.map((p) => (
              <Card key={p.challengeId}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle>
                      <Link href={`/app/challenge/${p.challenge.slug}`} className="hover:underline">
                        {p.challenge.name}
                      </Link>
                    </CardTitle>
                    <Link
                      href="/app/bets"
                      className="text-xs text-muted-foreground underline underline-offset-2"
                    >
                      Mijn bets
                    </Link>
                  </div>
                  <CardDescription>
                    {p.status === "joined" && !p.paidBuyIn
                      ? "Je inleg is nog niet geregistreerd"
                      : `Saldo: €${p.balance.toLocaleString("nl-NL")}`}
                  </CardDescription>
                  {p.status === "active" && (
                    <Countdown label="Nog" target={p.challenge.endAt.toISOString()} />
                  )}
                </CardHeader>
              </Card>
            ))}
          </div>

          {activeParticipation && (
            <section className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">Activiteit</h2>
              <ActivityFeed challengeId={activeParticipation.challengeId} currentUserId={user.id} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
