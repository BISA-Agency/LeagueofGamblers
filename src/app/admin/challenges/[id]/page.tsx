import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { challenges } from "@drizzle/schema";
import { SportsbookSettingsForm } from "./sportsbook-settings-form";

export const metadata: Metadata = { title: "Challenge-instellingen" };

export default async function AdminChallengeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const challenge = await db.query.challenges.findFirst({ where: eq(challenges.id, id) });
  if (!challenge) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">{challenge.name}</h1>
        <Button asChild size="sm" variant="outline" className="h-11">
          <Link href={`/admin/challenges/${challenge.id}/sportsbook`}>Sportsbook beheren</Link>
        </Button>
      </div>

      <div className="rounded-lg border border-border p-4">
        <h2 className="mb-4 text-sm font-medium text-muted-foreground">Sportsbook-instellingen</h2>
        <SportsbookSettingsForm
          challengeId={challenge.id}
          defaultSportKeys={challenge.sportKeys}
          defaultMarkets={challenge.markets}
          defaultAutoPublish={challenge.autoPublishImports}
        />
      </div>
    </div>
  );
}
