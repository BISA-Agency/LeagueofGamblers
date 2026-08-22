import type { Metadata } from "next";
import Link from "next/link";
import { desc } from "drizzle-orm";
import { publishChallenge } from "@/actions/admin/challenges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { challenges } from "@drizzle/schema";

export const metadata: Metadata = { title: "Challenges beheren" };

const STATUS_LABEL: Record<string, string> = {
  draft: "Concept",
  open: "Open voor inschrijving",
  live: "Bezig",
  settling: "Wordt afgerond",
  finished: "Afgelopen",
};

const dateFormatter = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Amsterdam",
});

export default async function AdminChallengesPage() {
  const all = await db.query.challenges.findMany({ orderBy: desc(challenges.createdAt) });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Challenges</h1>
        <Button asChild size="sm" className="h-11">
          <Link href="/admin/challenges/new">Nieuwe challenge</Link>
        </Button>
      </div>

      {all.length === 0 && (
        <p className="text-sm text-muted-foreground">Nog geen challenges aangemaakt.</p>
      )}

      <div className="space-y-3">
        {all.map((challenge) => (
          <Card key={challenge.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle>{challenge.name}</CardTitle>
                <Badge variant="secondary">{STATUS_LABEL[challenge.status]}</Badge>
              </div>
              <CardDescription className="tabular-nums">
                /c/{challenge.slug} · {dateFormatter.format(challenge.startAt)} –{" "}
                {dateFormatter.format(challenge.endAt)} · Startsaldo €
                {challenge.startingBalance.toLocaleString("nl-NL")} · Inleg €
                {challenge.buyInAmount.toLocaleString("nl-NL")}
              </CardDescription>
            </CardHeader>
            {challenge.status === "draft" && (
              <CardFooter className="justify-end border-t-0 bg-transparent p-0 px-4 pb-4">
                <form action={publishChallenge.bind(null, challenge.id)}>
                  <Button type="submit" size="sm" variant="outline" className="h-11">
                    Open voor inschrijving
                  </Button>
                </form>
              </CardFooter>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
