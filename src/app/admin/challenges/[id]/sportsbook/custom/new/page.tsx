import type { Metadata } from "next";
import { NewCustomEventForm } from "./new-custom-event-form";

export const metadata: Metadata = { title: "Custom event toevoegen" };

export default async function NewCustomEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">Custom event toevoegen</h1>
      <p className="text-sm text-muted-foreground">
        Voor alles wat niet uit The Odds API komt: UFC, darts, specials. Spelers zien dit als
        gewoon sportsbook-event, maar jij settelt het straks zelf.
      </p>
      <NewCustomEventForm challengeId={id} />
    </div>
  );
}
