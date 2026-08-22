import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { toggleParticipantPaid } from "@/actions/admin/challenge-lifecycle";
import { UserAvatar } from "@/components/profile/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { challenges } from "@drizzle/schema";

export const metadata: Metadata = { title: "Spelers" };

const STATUS_LABEL: Record<string, string> = {
  joined: "Aangemeld",
  active: "Actief",
  bust: "Bust 💀",
  kicked: "Verwijderd",
  disqualified: "Gediskwalificeerd",
};

export default async function AdminPlayersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const challenge = await db.query.challenges.findFirst({
    where: eq(challenges.id, id),
    with: { participants: { with: { user: true } } },
  });
  if (!challenge) notFound();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">Spelers — {challenge.name}</h1>

      {challenge.participants.length === 0 && (
        <p className="text-sm text-muted-foreground">Nog niemand aangemeld.</p>
      )}

      <div className="divide-y divide-border rounded-lg border border-border">
        {challenge.participants.map((p) => (
          <div key={p.userId} className="flex items-center justify-between gap-3 p-4">
            <div className="flex min-w-0 items-center gap-3">
              <UserAvatar username={p.user.username} avatarUrl={p.user.avatarUrl} size={36} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{p.user.username}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {STATUS_LABEL[p.status]}
                  {p.status === "active" && ` · €${p.balance.toLocaleString("nl-NL")}`}
                </p>
              </div>
            </div>
            <form action={toggleParticipantPaid.bind(null, challenge.id, p.userId, !p.paidBuyIn)}>
              <Button type="submit" size="sm" variant={p.paidBuyIn ? "outline" : "default"} className="h-11">
                {p.paidBuyIn ? (
                  <Badge className="border-profit/30 bg-profit/15 text-profit">Betaald</Badge>
                ) : (
                  "Markeer als betaald"
                )}
              </Button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
