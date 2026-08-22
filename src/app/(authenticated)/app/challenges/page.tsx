import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { getChallengeStats } from "@/lib/challenges/stats";
import type { PrizeTierRow } from "@/lib/settlement/payouts";
import { createClient } from "@/lib/supabase/server";
import { JoinButton } from "./join-button";

export const metadata: Metadata = { title: "Challenges" };

const STATUS_LABEL: Record<string, string> = {
  open: "Open voor inschrijving",
  live: "Bezig",
  settling: "Wordt afgerond",
};

const money = new Intl.NumberFormat("nl-NL", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

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

  const [allChallenges, myParticipations, prizeTiers] = await Promise.all([
    db.query.challenges.findMany({
      where: (c, { inArray }) => inArray(c.status, ["open", "live", "settling"]),
      orderBy: (c, { asc }) => asc(c.startAt),
      with: { participants: { with: { user: { columns: { username: true, avatarUrl: true } } } } },
    }),
    user
      ? db.query.challengeParticipants.findMany({
          where: (p, { eq }) => eq(p.userId, user.id),
        })
      : Promise.resolve([]),
    db.query.prizeTiers.findMany(),
  ]);

  const joinedIds = new Set(myParticipations.map((p) => p.challengeId));

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Challenges</h1>
        <p className="text-sm text-muted-foreground">
          Doe mee met een lopende of binnenkort startende challenge.
        </p>
      </div>

      {allChallenges.length === 0 && (
        <p className="text-sm text-muted-foreground">Er zijn nog geen open challenges.</p>
      )}

      {allChallenges.map((challenge) => {
        const joined = joinedIds.has(challenge.id);
        const stats = getChallengeStats(
          challenge,
          challenge.participants,
          prizeTiers as PrizeTierRow[]
        );

        return (
          <div
            key={challenge.id}
            className="overflow-hidden rounded-xl border border-border bg-card"
          >
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold tracking-tight">
                    <Link href={`/c/${challenge.slug}`} className="hover:underline">
                      {challenge.name}
                    </Link>
                  </h2>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <CalendarDays className="size-3.5 shrink-0" />
                    <span className="tabular-nums">
                      {dateFormatter.format(challenge.startAt)} –{" "}
                      {dateFormatter.format(challenge.endAt)}
                    </span>
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {STATUS_LABEL[challenge.status] ?? challenge.status}
                </Badge>
              </div>

              {/* The two numbers that decide whether someone joins. */}
              <div className="mt-5 flex items-end justify-between gap-4">
                <div>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="size-3.5" />
                    Spelers
                  </p>
                  <p className="text-2xl font-semibold tabular-nums">{stats.joinedCount}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Prijzenpot</p>
                  <p className="text-2xl font-semibold tabular-nums text-accent-brand">
                    €{money.format(stats.pot)}
                  </p>
                </div>
              </div>

              {stats.joinedCount > 0 && (
                <p className="mt-3 truncate text-xs text-muted-foreground">
                  {challenge.participants
                    .slice(0, 5)
                    .map((p) => p.user.username)
                    .join(", ")}
                  {stats.joinedCount > 5 && ` +${stats.joinedCount - 5}`}
                </p>
              )}

              <p className="mt-3 text-xs text-muted-foreground tabular-nums">
                Inleg €{money.format(challenge.buyInAmount)} · startsaldo €
                {money.format(challenge.startingBalance)} virtueel
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border bg-secondary/20 px-5 py-3">
              {joined ? (
                <>
                  <span className="text-sm text-profit">Je doet mee</span>
                  <Link
                    href={`/app/challenge/${challenge.slug}`}
                    className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  >
                    Bekijk challenge
                  </Link>
                </>
              ) : challenge.status === "open" ? (
                <>
                  <span className="text-sm text-muted-foreground">
                    Meedoen kost €{money.format(challenge.buyInAmount)}
                  </span>
                  <JoinButton challengeId={challenge.id} />
                </>
              ) : (
                <span className="text-sm text-muted-foreground">Inschrijving gesloten</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
