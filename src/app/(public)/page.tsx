import Link from "next/link";
import { Button } from "@/components/ui/button";

// Minimal placeholder — the full marketing landing page (hero, features,
// screenshots, FAQ) is built in Fase 2b, once there's a real app to show.
export default function LandingPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-16 text-center">
      <p className="mb-3 text-sm font-medium tracking-wide text-accent-brand uppercase">
        League of Gamblers
      </p>
      <h1 className="max-w-xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
        €10.000 virtueel. Eén maand. Hoogste saldo wint de pot.
      </h1>
      <p className="mt-4 max-w-md text-balance text-muted-foreground">
        De maandelijkse virtuele sportsbetting-challenge voor jou en je vrienden.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg" className="h-11">
          <Link href="/login">Doe mee</Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-11">
          <Link href="/rules">Bekijk de regels</Link>
        </Button>
      </div>
    </main>
  );
}
