import type { Metadata } from "next";
import { getActiveParticipation } from "@/lib/challenges/active";
import { createClient } from "@/lib/supabase/server";
import { ProofBetForm } from "./proof-bet-form";

export const metadata: Metadata = { title: "Bewijsbet" };

export default async function ProofBetPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { active: participation } = await getActiveParticipation(user.id);

  if (!participation || participation.status !== "active") {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-lg font-semibold">Bewijsbet</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Je hebt hiervoor een actieve, lopende challenge nodig.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Bewijsbet</h1>
        <p className="text-sm text-muted-foreground">{participation.challenge.name}</p>
      </div>

      <details className="rounded-lg border border-border p-4 text-sm">
        <summary className="cursor-pointer font-medium">Hoe werkt een bewijsbet?</summary>
        <div className="mt-3 space-y-2 text-muted-foreground">
          <p>
            Gebruik dit voor alles wat niet in het sportsbook staat: een andere competitie, een
            cornermarkt, een doelpuntenmaker, een special bij je eigen bookmaker.
          </p>
          <p>Je screenshot van de bet slip bij de bookmaker moet duidelijk laten zien:</p>
          <ul className="list-disc space-y-1 pl-4">
            <li>de selectie(s) en de quoteringen</li>
            <li>de ingevulde inzet</li>
            <li>bij voorkeur de klok/statusbalk van je telefoon</li>
          </ul>
          <p>
            Je hoeft de bet niet écht te plaatsen — alleen het bedrag invullen zodat het op de
            foto staat is genoeg. De screenshot moet gemaakt zijn vóórdat de wedstrijd begint;
            een live-markering of tussenstand leidt tot afkeuring.
          </p>
        </div>
      </details>

      <ProofBetForm challengeId={participation.challengeId} />
    </div>
  );
}
