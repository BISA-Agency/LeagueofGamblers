import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Flame, RefreshCw, Skull, Target, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Countdown } from "@/components/challenges/countdown";
import { db } from "@/lib/db";
import { canJoinChallenge } from "@/lib/challenges/eligibility";
import { isHotChallenge } from "@/lib/challenges/hot";
import { getChallengeStats } from "@/lib/challenges/stats";
import type { PrizeTierRow } from "@/lib/settlement/payouts";
import { createClient } from "@/lib/supabase/server";
import { JoinButton } from "./join-button";

export const metadata: Metadata = { title: "Challenges" };

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  live: "Bezig",
  settling: "Wordt afgerond",
  finished: "Afgelopen",
};

const DURATION_LABEL: Record<string, string> = {
  week: "Week",
  month: "Maand",
  season: "Seizoen",
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

const DAY_MS = 86_400_000;

export default async function ChallengesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [allChallenges, myParticipations, prizeTiers] = await Promise.all([
    db.query.challenges.findMany({
      where: (c, { ne }) => ne(c.status, "draft"),
      orderBy: (c, { desc }) => desc(c.startAt),
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
  const hotFlags = new Map(
    await Promise.all(
      allChallenges
        .filter((c) => c.status === "live")
        .map(async (c) => [c.id, await isHotChallenge(c.id)] as const)
    )
  );

  const groups = [
    {
      key: "open",
      title: "Open voor inschrijving",
      hint: "Meld je aan voordat de challenge begint.",
      items: allChallenges.filter((c) => c.status === "open"),
    },
    {
      key: "running",
      title: "Nu bezig",
      hint: "Deze lopen — inschrijving is gesloten, tenzij late-join open staat.",
      items: allChallenges.filter((c) => c.status === "live" || c.status === "settling"),
    },
    {
      key: "done",
      title: "Afgelopen",
      hint: null,
      items: allChallenges.filter((c) => c.status === "finished"),
    },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Challenges</h1>
        <p className="text-sm text-muted-foreground">
          Alles wat loopt, binnenkort begint of al is afgelopen.
        </p>
      </div>

      {groups.length === 0 && (
        <p className="text-sm text-muted-foreground">Er zijn nog geen challenges.</p>
      )}

      {groups.map((group) => (
        <section key={group.key} className="space-y-3">
          <div>
            <h2 className="text-sm font-medium text-muted-foreground">
              {group.title} ({group.items.length})
            </h2>
            {group.hint && <p className="text-xs text-muted-foreground/70">{group.hint}</p>}
          </div>

          {group.items.map((challenge) => {
            const joined = joinedIds.has(challenge.id);
            const stats = getChallengeStats(challenge, challenge.participants, prizeTiers as PrizeTierRow[]);
            const canJoin = canJoinChallenge(challenge);
            const lateJoinDeadline =
              challenge.status === "live" && challenge.lateJoinDays > 0
                ? new Date(challenge.startAt.getTime() + challenge.lateJoinDays * DAY_MS)
                : null;
            const isLateJoinOpen = canJoin && challenge.status === "live";
            const seatsNearlyFull =
              stats.maxPlayers !== null && stats.joinedCount >= stats.maxPlayers - 2 && stats.joinedCount < stats.maxPlayers;
            const isHot = hotFlags.get(challenge.id) ?? false;

            return (
              <div key={challenge.id} className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="truncate text-lg font-semibold tracking-tight">
                          <Link href={`/c/${challenge.slug}`} className="hover:underline">
                            {challenge.name}
                          </Link>
                        </h3>
                        {isHot && (
                          <Badge variant="outline" className="gap-1 border-loss/40 text-loss">
                            <Flame className="size-3" /> Hot
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <CalendarDays className="size-3.5 shrink-0" />
                        <span className="tabular-nums">
                          {dateFormatter.format(challenge.startAt)} – {dateFormatter.format(challenge.endAt)}
                        </span>
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {DURATION_LABEL[challenge.durationType] && (
                          <Badge variant="secondary">{DURATION_LABEL[challenge.durationType]}</Badge>
                        )}
                        {challenge.prizeMode === "hardcore" && (
                          <Badge variant="outline" className="gap-1 border-accent-brand/40 text-accent-brand">
                            <Skull className="size-3" /> Hardcore
                          </Badge>
                        )}
                        {challenge.allowRebuy && (
                          <Badge variant="outline" className="gap-1">
                            <RefreshCw className="size-3" /> Rebuy
                          </Badge>
                        )}
                        {challenge.bountyEnabled && (
                          <Badge variant="outline" className="gap-1">
                            <Target className="size-3" /> Bounty
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {STATUS_LABEL[challenge.status] ?? challenge.status}
                    </Badge>
                  </div>

                  <div className="mt-5 flex items-end justify-between gap-4">
                    <div>
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Users className="size-3.5" />
                        Spelers
                      </p>
                      <p className={"text-2xl font-semibold tabular-nums" + (seatsNearlyFull ? " text-loss" : "")}>
                        {stats.joinedCount}
                        {stats.maxPlayers !== null && (
                          <span className="text-sm font-normal text-muted-foreground">/{stats.maxPlayers}</span>
                        )}
                      </p>
                      {seatsNearlyFull && (
                        <p className="text-xs text-loss">
                          Nog maar {(stats.maxPlayers as number) - stats.joinedCount} plekken over
                        </p>
                      )}
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
                  ) : isLateJoinOpen && lateJoinDeadline ? (
                    <>
                      <Countdown label="Late registratie sluit over" target={lateJoinDeadline.toISOString()} />
                      <JoinButton challengeId={challenge.id} label="Nog meedoen" />
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {challenge.status === "finished" ? "Afgelopen" : "Inschrijving gesloten"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
