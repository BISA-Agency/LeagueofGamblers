import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
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

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Welkom terug</h1>
        <p className="text-sm text-muted-foreground">
          Hier komt straks je activiteit, saldo en rank.
        </p>
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
        <div className="space-y-3">
          {participations.map((p) => (
            <Card key={p.challengeId}>
              <CardHeader>
                <CardTitle>{p.challenge.name}</CardTitle>
                <CardDescription>
                  {p.status === "joined" && !p.paidBuyIn
                    ? "Je inleg is nog niet geregistreerd"
                    : `Saldo: €${p.balance.toLocaleString("nl-NL")}`}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
