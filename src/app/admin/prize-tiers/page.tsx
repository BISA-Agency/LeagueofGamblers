import type { Metadata } from "next";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import type { PrizeSplitEntry } from "@/lib/settlement/payouts";
import { NewPrizeTierForm } from "./new-prize-tier-form";

export const metadata: Metadata = { title: "Prize tiers" };

export default async function AdminPrizeTiersPage() {
  const tiers = await db.query.prizeTiers.findMany({ orderBy: (t, { asc }) => asc(t.minPlayers) });

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold tracking-tight">Prize tiers (potverdeling-staffel)</h1>
      <p className="text-sm text-muted-foreground">
        Geldt voor alle challenges tenzij een challenge een eigen override heeft.
      </p>

      <div className="rounded-lg border border-border p-4">
        <h2 className="mb-4 text-sm font-medium text-muted-foreground">Nieuwe staffel</h2>
        <NewPrizeTierForm />
      </div>

      <div className="space-y-3">
        {tiers.map((tier) => (
          <Card key={tier.id}>
            <CardHeader>
              <CardTitle className="text-sm">{tier.label}</CardTitle>
              <CardDescription className="tabular-nums">
                {tier.minPlayers}
                {tier.maxPlayers ? `–${tier.maxPlayers}` : "+"} spelers ·{" "}
                {(tier.split as PrizeSplitEntry[])
                  .map((s) => `#${s.rank}: ${s.percent}%`)
                  .join(" · ")}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
