import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChallengeResults } from "@/components/challenges/challenge-results";
import { getChallengeResults } from "@/lib/challenges/results";

export const metadata: Metadata = { title: "Eindstand-voorbeeld" };

/**
 * The end-of-challenge board as players will see it, before they see it.
 *
 * Same component and same query as the home page — not a mock-up, so what
 * looks wrong here is wrong there. While the challenge is still running the
 * ranking is today's balance order and the prizes are computed from the same
 * split finishChallenge would apply, which is exactly the part worth checking
 * before real money is attached to it.
 *
 * Nothing here changes any data: it reads, computes, and renders. Setting a
 * challenge to finished just to look at this screen would be the one thing
 * this page exists to avoid.
 */
export default async function ResultsPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ final?: string }>;
}) {
  const { id } = await params;
  const { final: finalParam } = await searchParams;

  const results = await getChallengeResults(id);
  if (!results) notFound();

  /**
   * ?final=1 renders the players' version of the same board — the header says
   * "Eindstand" instead of "Voorbeeld". Purely how it is labelled; the numbers
   * underneath are identical, and the challenge is not touched.
   */
  const asFinal = finalParam === "1";
  const shown = asFinal ? { ...results, final: true } : results;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Eindstand-voorbeeld</h1>
        <p className="text-sm text-muted-foreground">
          {results.final ? (
            <>
              Deze challenge is afgerond — dit is precies wat er op de homepage van elke speler
              staat.
            </>
          ) : (
            <>
              Deze challenge loopt nog. De stand is echt, de prijzen zijn wat er <em>nu</em> zou
              worden uitgekeerd. Spelers zien dit scherm pas als de challenge op afgerond staat;
              er wordt hier niets gewijzigd.
            </>
          )}
        </p>
      </div>

      {!results.final && (
        <p className="text-sm">
          <Link
            href={`/admin/challenges/${id}/results${asFinal ? "" : "?final=1"}`}
            className="text-accent-brand underline underline-offset-2"
          >
            {asFinal ? "Terug naar de voorbeeldweergave" : "Bekijk zoals spelers hem straks zien"}
          </Link>
        </p>
      )}

      <ChallengeResults results={shown} />

      <p className="text-sm text-muted-foreground">
        <Link href={`/admin/challenges/${id}`} className="underline underline-offset-2">
          Terug naar de challenge
        </Link>
      </p>
    </div>
  );
}
