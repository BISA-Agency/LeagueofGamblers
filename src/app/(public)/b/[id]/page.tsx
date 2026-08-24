import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SharedBetSlip } from "@/components/bets/shared-bet-slip";
import { UserAvatar } from "@/components/profile/user-avatar";
import { ShareButton } from "@/components/share/share-button";
import { Button } from "@/components/ui/button";
import { getSharedBet, sharedBetHeadline } from "@/lib/bets/shared-bet";
import { shareLink } from "@/lib/share/url";

type Params = Promise<{ id: string }>;

const placedFormatter = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Amsterdam",
});

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const bet = await getSharedBet(id);
  if (!bet) return { title: "Bet" };

  const title = `${bet.user.username} ${sharedBetHeadline(bet)}`;
  const description = `${
    bet.type === "combi" ? `Combi met ${bet.selections.length} selecties` : "Single"
  } · ${bet.totalOdds.toFixed(2)} odds · ${bet.challenge.name}`;
  const images = [`/api/og/bet/${bet.id}`];

  return {
    title,
    description,
    // Somebody's personal play is not a page that belongs in search results.
    // Unfurling a shared link doesn't need indexing — the crawler that builds
    // the preview reads the og: tags either way.
    robots: { index: false, follow: true },
    openGraph: { title, description, images },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

export default async function SharedBetPage({ params }: { params: Params }) {
  const { id } = await params;
  const bet = await getSharedBet(id);
  if (!bet) notFound();

  const headline = `${bet.user.username} ${sharedBetHeadline(bet)}`;

  return (
    <main className="mx-auto max-w-xl px-6 py-14">
      <Link href="/" className="text-sm font-medium text-accent-brand">
        League of Gamblers
      </Link>

      <div className="mt-5 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar username={bet.user.username} avatarUrl={bet.user.avatarUrl} size={44} />
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-balance">{headline}</h1>
            <p className="text-xs text-muted-foreground">
              {bet.challenge.name} · geplaatst {placedFormatter.format(bet.placedAt)}
            </p>
          </div>
        </div>
        <ShareButton
          url={shareLink(`/b/${bet.id}`)}
          title={headline}
          text="Kijk deze bet op League of Gamblers."
        />
      </div>

      <div className="mt-6">
        <SharedBetSlip bet={bet} />
      </div>

      <p className="mt-6 text-sm text-muted-foreground text-pretty">
        Gespeeld met virtueel geld in <span className="text-foreground">{bet.challenge.name}</span>.
        Iedereen start met hetzelfde saldo, het hoogste eindsaldo pakt de pot.
      </p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg" className="h-12 text-base">
          <Link href={`/c/${bet.challenge.slug}`}>Doe mee met deze challenge</Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-12 text-base">
          <Link href="/rules">Spelregels</Link>
        </Button>
      </div>
    </main>
  );
}
