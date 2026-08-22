import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PredictionSection } from "@/components/challenges/prediction-section";
import { FieldChart } from "@/components/charts/field-chart";
import { Sparkline } from "@/components/charts/sparkline";
import { UserAvatar } from "@/components/profile/user-avatar";
import { Badge } from "@/components/ui/badge";
import { getSnapshotsForUsers } from "@/lib/challenges/rank-snapshots";
import { db } from "@/lib/db";
import { calculatePrizeSplit, type PrizeTierRow } from "@/lib/settlement/payouts";
import { challenges } from "@drizzle/schema";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Challenge" };

const dateFormatter = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Amsterdam",
});

const STATUS_LABEL: Record<string, string> = {
  draft: "Nog niet open",
  open: "Open voor inschrijving",
  live: "Bezig",
  settling: "Wordt afgerond",
  finished: "Afgelopen",
};

export default async function ChallengeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const challenge = await db.query.challenges.findFirst({
    where: eq(challenges.slug, slug),
    with: { participants: { with: { user: true } } },
  });
  if (!challenge) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const paid = challenge.participants.filter((p) => p.paidBuyIn);
  const myUsername = paid.find((p) => p.userId === user?.id)?.user.username;
  const pot = paid.length * challenge.buyInAmount;
  const prizeTierRows = await db.query.prizeTiers.findMany();
  const tiers = ((challenge.prizeSplitOverride as PrizeTierRow[] | null) ?? prizeTierRows) as PrizeTierRow[];
  const split = calculatePrizeSplit(paid.length, pot, tiers);

  const ranked = [...paid].sort((a, b) => b.balance - a.balance);
  const snapshots = await getSnapshotsForUsers(
    challenge.id,
    ranked.map((p) => p.userId)
  );
  const snapshotsByUser = new Map<string, { date: string; balance: number }[]>();
  for (const s of snapshots) {
    const list = snapshotsByUser.get(s.userId) ?? [];
    list.push({ date: s.date, balance: s.balance });
    snapshotsByUser.set(s.userId, list);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-6">
      <div>
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-semibold tracking-tight">{challenge.name}</h1>
          <Badge variant="secondary">{STATUS_LABEL[challenge.status]}</Badge>
        </div>
        <p className="text-sm text-muted-foreground tabular-nums">
          {dateFormatter.format(challenge.startAt)} – {dateFormatter.format(challenge.endAt)}
        </p>
      </div>

      {challenge.descriptionMd && (
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">{challenge.descriptionMd}</p>
      )}

      <section className="rounded-lg border border-border p-4 text-sm">
        <p className="mb-2 text-muted-foreground">
          {paid.length} betaalde spelers · pot €{pot.toLocaleString("nl-NL")}
        </p>
        {split.length > 0 && (
          <p className="tabular-nums font-medium">
            {split.map((s) => `#${s.rank} €${s.amount.toLocaleString("nl-NL")}`).join(" · ")}
          </p>
        )}
        <div className="mt-2 flex gap-4">
          <Link href="/rules" className="text-accent-brand underline underline-offset-2">
            Spelregels
          </Link>
          {myUsername && (challenge.status === "settling" || challenge.status === "finished") && (
            <Link
              href={`/wrapped/${challenge.id}/${myUsername}`}
              className="text-accent-brand underline underline-offset-2"
            >
              Jouw Wrapped
            </Link>
          )}
        </div>
      </section>

      {user && (
        <PredictionSection
          challenge={challenge}
          players={paid.map((p) => ({ userId: p.userId, username: p.user.username }))}
          currentUserId={user.id}
        />
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Verloop van het veld</h2>
        <FieldChart
          series={ranked.map((p) => ({
            username: p.user.username,
            points: snapshotsByUser.get(p.userId) ?? [],
          }))}
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Deelnemers ({paid.length})</h2>
        <div className="divide-y divide-border rounded-lg border border-border">
          {ranked.map((p) => (
            <div key={p.userId} className="flex items-center justify-between gap-3 p-3">
              <div className="flex min-w-0 items-center gap-2">
                <UserAvatar username={p.user.username} avatarUrl={p.user.avatarUrl} size={28} />
                <Link href={`/app/profile/${p.user.username}`} className="truncate text-sm hover:underline">
                  {p.user.username}
                </Link>
              </div>
              <div className="flex items-center gap-3">
                <Sparkline values={(snapshotsByUser.get(p.userId) ?? []).map((s) => s.balance)} />
                <span className="tabular-nums text-sm font-medium">
                  €{p.balance.toLocaleString("nl-NL")}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
