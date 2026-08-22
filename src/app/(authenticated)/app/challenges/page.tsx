import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { JoinButton } from "./join-button";

export const metadata: Metadata = { title: "Challenges" };

const STATUS_LABEL: Record<string, string> = {
  draft: "Nog niet open",
  open: "Open voor inschrijving",
  live: "Bezig",
  settling: "Wordt afgerond",
  finished: "Afgelopen",
};

const dateFormatter = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "long",
  timeZone: "Europe/Amsterdam",
});

export default async function ChallengesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [allChallenges, myParticipations] = await Promise.all([
    db.query.challenges.findMany({
      where: (c, { inArray }) => inArray(c.status, ["open", "live", "settling"]),
      orderBy: (c, { asc }) => asc(c.startAt),
    }),
    user
      ? db.query.challengeParticipants.findMany({
          where: (p, { eq }) => eq(p.userId, user.id),
        })
      : Promise.resolve([]),
  ]);

  const joinedIds = new Set(myParticipations.map((p) => p.challengeId));

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Challenges</h1>
        <p className="text-sm text-muted-foreground">
          Doe mee met een lopende of binnenkort startende challenge.
        </p>
      </div>

      {allChallenges.length === 0 && (
        <p className="text-sm text-muted-foreground">Er zijn nog geen open challenges.</p>
      )}

      <div className="space-y-3">
        {allChallenges.map((challenge) => {
          const joined = joinedIds.has(challenge.id);
          return (
            <Card key={challenge.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle>{challenge.name}</CardTitle>
                  <Badge variant="secondary">{STATUS_LABEL[challenge.status]}</Badge>
                </div>
                <CardDescription className="tabular-nums">
                  {dateFormatter.format(challenge.startAt)} – {dateFormatter.format(challenge.endAt)}
                  {" · Startsaldo €"}
                  {challenge.startingBalance.toLocaleString("nl-NL")}
                  {" · Inleg €"}
                  {challenge.buyInAmount.toLocaleString("nl-NL")}
                </CardDescription>
              </CardHeader>
              <CardFooter className="justify-end border-t-0 bg-transparent p-0 px-4 pb-4">
                {joined ? (
                  <Badge className="border-profit/30 bg-profit/15 text-profit">
                    Je doet mee
                  </Badge>
                ) : challenge.status === "open" ? (
                  <JoinButton challengeId={challenge.id} />
                ) : (
                  <span className="text-xs text-muted-foreground">Inschrijving gesloten</span>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
