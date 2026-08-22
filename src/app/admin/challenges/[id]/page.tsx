import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { transitionChallengeToLive } from "@/actions/admin/challenge-lifecycle";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { challenges } from "@drizzle/schema";
import { ChallengeRulesForm } from "./challenge-rules-form";
import { FinishChallengeForm } from "./finish-challenge-form";
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight">{challenge.name}</h1>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline" className="h-11">
            <Link href={`/admin/challenges/${challenge.id}/players`}>Spelers</Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="h-11">
            <Link href={`/admin/challenges/${challenge.id}/sportsbook`}>Sportsbook beheren</Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="h-11">
            <Link href={`/admin/challenges/${challenge.id}/missions`}>Missies</Link>
          </Button>
        </div>
      </div>

      {challenge.status === "open" && (
        <div className="rounded-lg border border-border p-4">
          <p className="mb-3 text-sm text-muted-foreground">
            Zet deze challenge live: betaalde deelnemers krijgen hun startsaldo en kunnen wedden.
            Gebeurt normaal automatisch op de startdatum.
          </p>
          <form action={transitionChallengeToLive.bind(null, challenge.id)}>
            <Button type="submit" size="sm" className="h-11">
              Nu live zetten
            </Button>
          </form>
        </div>
      )}

      {challenge.status === "settling" && (
        <div className="rounded-lg border border-border p-4">
          <FinishChallengeForm challengeId={challenge.id} />
        </div>
      )}

      <div className="rounded-lg border border-border p-4">
        <h2 className="mb-4 text-sm font-medium text-muted-foreground">Spelregels</h2>
        <ChallengeRulesForm
          challengeId={challenge.id}
          defaultMissionBudget={challenge.missionBudget}
          defaultAllowRebuy={challenge.allowRebuy}
        />
      </div>

      <div className="rounded-lg border border-border p-4">
        <h2 className="mb-4 text-sm font-medium text-muted-foreground">Sportsbook-instellingen</h2>
        <SportsbookSettingsForm
          challengeId={challenge.id}
          defaultSportKeys={challenge.sportKeys}
          defaultMarkets={challenge.markets}
          defaultAutoPublish={challenge.autoPublishImports}
          defaultMidweekImport={challenge.midweekImportEnabled}
        />
      </div>
    </div>
  );
}
