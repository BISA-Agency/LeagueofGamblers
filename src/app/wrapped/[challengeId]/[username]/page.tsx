import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgeIcon } from "@/components/badges/badge-icon";
import { Sparkline } from "@/components/charts/sparkline";
import { UserAvatar } from "@/components/profile/user-avatar";
import { getWrappedData } from "@/lib/challenges/wrapped";
import { DEFAULT_SPORT_KEYS, DEFAULT_SPORT_LABELS } from "@/lib/odds-provider/sports";

const money = new Intl.NumberFormat("nl-NL", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function sportLabel(sport: string): string {
  const key = Object.keys(DEFAULT_SPORT_KEYS).find((k) => DEFAULT_SPORT_KEYS[k] === sport);
  return key ? DEFAULT_SPORT_LABELS[key] : sport;
}

type Params = Promise<{ challengeId: string; username: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { challengeId, username } = await params;
  const data = await getWrappedData(challengeId, username);
  if (!data) return { title: "Wrapped" };

  const title = `${data.profile.username} · ${data.challenge.name} Wrapped`;
  const description = `#${data.rank} van ${data.playerCount} — €${money.format(data.balance)} eindsaldo, ${data.betsCount} bets, ${data.winrate.toFixed(0)}% winrate.`;
  const image = `/api/og/wrapped/${challengeId}/${data.profile.username}`;

  return {
    title,
    description,
    openGraph: { title, description, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "profit" | "loss" }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={`mt-0.5 text-lg font-semibold tabular-nums ${
          tone === "profit" ? "text-profit" : tone === "loss" ? "text-loss" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

export default async function WrappedPage({ params }: { params: Params }) {
  const { challengeId, username } = await params;
  const data = await getWrappedData(challengeId, username);
  if (!data) notFound();

  const signed = (v: number) =>
    v === 0 ? "€0" : `${v > 0 ? "+" : "−"}€${money.format(Math.abs(v))}`;
  const tone = (v: number) => (v === 0 ? undefined : v > 0 ? ("profit" as const) : ("loss" as const));

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-10">
      <header className="space-y-3 text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-accent-brand">
          {data.challenge.name} Wrapped
        </p>
        <div className="flex flex-col items-center gap-2">
          <UserAvatar
            username={data.profile.username}
            avatarUrl={data.profile.avatarUrl}
            size={72}
          />
          <h1 className="text-2xl font-semibold tracking-tight">{data.profile.username}</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Eindigde als{" "}
          <span className="font-semibold text-foreground">#{data.rank}</span> van{" "}
          {data.playerCount} spelers
        </p>
      </header>

      {data.balanceHistory.length > 1 && (
        <div className="flex justify-center">
          <Sparkline values={data.balanceHistory.map((p) => p.balance)} width={280} height={64} />
        </div>
      )}

      <dl className="grid grid-cols-2 gap-3">
        <Stat label="Eindsaldo" value={`€${money.format(data.balance)}`} />
        <Stat label="Winst/verlies" value={signed(data.pl)} tone={tone(data.pl)} />
        <Stat
          label="ROI"
          value={`${data.roi > 0 ? "+" : ""}${data.roi.toFixed(1)}%`}
          tone={tone(data.roi)}
        />
        <Stat label="Bets geplaatst" value={`${data.betsCount}`} />
        <Stat label="Winrate" value={`${data.winrate.toFixed(0)}%`} />
        <Stat label="Langste winreeks" value={`${data.longestWinStreak}`} />
        <Stat
          label="Grootste winst"
          value={signed(data.biggestWin)}
          tone={tone(data.biggestWin)}
        />
        <Stat
          label="Grootste verlies"
          value={signed(data.biggestLoss)}
          tone={tone(data.biggestLoss)}
        />
        <Stat label="Gem. quotering" value={data.avgOdds.toFixed(2)} />
        <Stat
          label="Hoogste gewonnen odds"
          value={data.highestWonOdds > 0 ? data.highestWonOdds.toFixed(2) : "—"}
        />
        <Stat label="Totaal ingezet" value={`€${money.format(data.totalStaked)}`} />
        <Stat
          label="Meest gespeeld"
          value={data.favoriteSport ? sportLabel(data.favoriteSport) : "—"}
        />
      </dl>

      {data.badges.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Badges deze challenge</h2>
          <div className="flex flex-wrap gap-3">
            {data.badges.map((badge) => (
              <div key={badge.id} className="flex flex-col items-center gap-1" title={badge.description}>
                <BadgeIcon icon={badge.icon} rarity={badge.rarity} size={44} />
                <span className="max-w-16 truncate text-center text-[10px] text-muted-foreground">
                  {badge.name}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {data.missions.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Missies behaald</h2>
          <ul className="space-y-1 text-sm">
            {data.missions.map((title) => (
              <li key={title}>{title}</li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-center text-xs text-muted-foreground">League of Gamblers</p>
    </div>
  );
}
