import { and, desc, eq, lte, ne } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { FlagBetButton } from "@/components/bets/flag-bet-button";
import { UserAvatar } from "@/components/profile/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { getActiveParticipation } from "@/lib/challenges/active";
import { db } from "@/lib/db";
import { bets } from "@drizzle/schema";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Bets van het veld" };

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  open: { label: "Open", className: "" },
  won: { label: "Gewonnen", className: "border-profit/30 bg-profit/15 text-profit" },
  lost: { label: "Verloren", className: "border-loss/30 bg-loss/15 text-loss" },
  void: { label: "Void", className: "" },
  half_won: { label: "Half gewonnen", className: "border-profit/30 bg-profit/15 text-profit" },
  half_lost: { label: "Half verloren", className: "border-loss/30 bg-loss/15 text-loss" },
};

const dateFormatter = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Amsterdam",
});

export default async function FieldBetsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { active: participation } = await getActiveParticipation(user.id);

  if (!participation) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-lg font-semibold">Bets van het veld</h1>
        <p className="mt-2 text-sm text-muted-foreground">Je doet nog niet mee aan een challenge.</p>
      </div>
    );
  }

  // The gate that matters: someone else's pick only becomes visible once its
  // earliest event has kicked off, so nobody can just copy the field (§5.4).
  const fieldBets = await db.query.bets.findMany({
    where: and(
      eq(bets.challengeId, participation.challengeId),
      ne(bets.userId, user.id),
      lte(bets.eventStart, new Date())
    ),
    orderBy: desc(bets.placedAt),
    limit: 60,
    with: { selections: true, user: true },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Bets van het veld</h1>
          <p className="text-sm text-muted-foreground">{participation.challenge.name}</p>
        </div>
        <Link
          href="/app/bets"
          className="shrink-0 text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Mijn bets
        </Link>
      </div>

      <p className="text-xs text-muted-foreground">
        Bets van medespelers verschijnen hier zodra hun wedstrijd is begonnen. Klopt er iets
        niet aan een bewijsbet? Betwist &apos;m, dan kijkt een admin ernaar.
      </p>

      {fieldBets.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nog geen bets van medespelers zichtbaar.
        </p>
      )}

      <div className="space-y-2">
        {fieldBets.map((bet) => {
          const status = STATUS_LABEL[bet.status];
          return (
            <Card key={bet.id}>
              <CardHeader className="gap-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <UserAvatar
                      username={bet.user.username}
                      avatarUrl={bet.user.avatarUrl}
                      size={24}
                    />
                    <Link
                      href={`/app/profile/${bet.user.username}`}
                      className="truncate text-sm font-medium hover:underline"
                    >
                      {bet.user.username}
                    </Link>
                  </div>
                  <Badge variant="secondary" className={status.className}>
                    {status.label}
                  </Badge>
                </div>
                <CardDescription className="tabular-nums">
                  {bet.kind === "proof" ? "Bewijsbet" : "Sportsbook"} · inzet €
                  {bet.stake.toLocaleString("nl-NL")} · odds {bet.totalOdds.toFixed(2)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                {bet.selections.map((s) => (
                  <p key={s.id} className="text-xs text-muted-foreground">
                    {s.eventName} — {s.selectionLabel} ({s.odds.toFixed(2)}) ·{" "}
                    {dateFormatter.format(s.eventStart)}
                  </p>
                ))}
              </CardContent>
              <div className="px-4 pb-4">
                <FlagBetButton betId={bet.id} />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
