import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { bets } from "@drizzle/schema";
import { createClient } from "@/lib/supabase/server";
import { BetCard } from "./bet-card";

export const metadata: Metadata = { title: "Mijn bets" };

export default async function BetsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const myBets = await db.query.bets.findMany({
    where: eq(bets.userId, user.id),
    orderBy: desc(bets.placedAt),
    with: { selections: true },
  });

  const open = myBets.filter((b) => b.status === "open");
  const settled = myBets.filter((b) => b.status !== "open");

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Mijn bets</h1>
        <Button asChild size="sm" className="h-11">
          <Link href="/app/bets/proof">+ Bewijsbet</Link>
        </Button>
      </div>

      {myBets.length === 0 && (
        <p className="text-sm text-muted-foreground">Je hebt nog geen bets geplaatst.</p>
      )}

      {open.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Open ({open.length})</h2>
          <div className="space-y-2">
            {open.map((bet) => (
              <BetCard key={bet.id} bet={bet} />
            ))}
          </div>
        </section>
      )}

      {settled.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Gesetteld ({settled.length})</h2>
          <div className="space-y-2">
            {settled.map((bet) => (
              <BetCard key={bet.id} bet={bet} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
