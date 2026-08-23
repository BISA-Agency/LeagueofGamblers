import Link from "next/link";
import { Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

// The prize podium's colours, reused so a podium finish is the same gold
// wherever it shows up.
const MEDAL = [
  { color: "#f5c74a", label: "Gewonnen" },
  { color: "#cfd4d9", label: "Tweede" },
  { color: "#d18f56", label: "Derde" },
] as const;

const STATUS_LABEL: Record<string, string> = {
  draft: "Nog niet open",
  open: "Begint binnenkort",
  live: "Bezig",
  settling: "Wordt afgerond",
  finished: "Afgelopen",
};

const money = (n: number) => n.toLocaleString("nl-NL", { maximumFractionDigits: 0 });

export type ChallengeHistoryRow = {
  challengeId: string;
  slug: string;
  name: string;
  status: string;
  finalRank: number | null;
  balance: number;
  started: boolean;
  paidBuyIn: boolean;
  /** Prize money from the pot, 0 when they finished off the podium. */
  prize: number;
  playerCount: number;
};

/** Rank disc: a medal for the podium, a plain numeral for everyone else. */
function RankDisc({ rank, size = 34 }: { rank: number; size?: number }) {
  const medal = rank <= 3 ? MEDAL[rank - 1] : null;
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold tabular-nums",
        medal ? "border-2" : "border border-border text-muted-foreground"
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        ...(medal
          ? { borderColor: medal.color, color: medal.color, backgroundColor: `${medal.color}1f` }
          : {}),
      }}
    >
      {rank}
    </span>
  );
}

export function ChallengeHistory({
  rows,
  isOwnProfile,
}: {
  rows: ChallengeHistoryRow[];
  isOwnProfile: boolean;
}) {
  const running = rows.filter((r) => r.status !== "finished");
  const finished = rows
    .filter((r) => r.status === "finished" && r.finalRank !== null)
    .sort((a, b) => a.finalRank! - b.finalRank!);
  const won = finished.filter((r) => r.finalRank === 1);
  const totalPrize = finished.reduce((sum, r) => sum + r.prize, 0);

  if (rows.length === 0) return null;

  return (
    <div className="space-y-6">
      {running.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Actieve challenges</h2>
          <div className="divide-y divide-border rounded-lg border border-border">
            {running.map((r) => (
              <div key={r.challengeId} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/app/challenge/${r.slug}`}
                    className="truncate text-sm font-medium hover:underline"
                  >
                    {r.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {STATUS_LABEL[r.status] ?? r.status} · {r.playerCount} spelers
                  </p>
                </div>
                {r.paidBuyIn ? (
                  <span className="flex shrink-0 items-center gap-1 text-xs text-profit">
                    <Check className="size-3.5" /> Inleg betaald
                  </span>
                ) : (
                  <span className="flex shrink-0 items-center gap-1 text-xs text-loss">
                    <Clock className="size-3.5" /> Inleg open
                  </span>
                )}
                {r.started && (
                  <span className="w-20 shrink-0 text-right text-sm font-medium tabular-nums">
                    €{money(r.balance)}
                  </span>
                )}
              </div>
            ))}
          </div>
          {isOwnProfile && running.some((r) => !r.paidBuyIn) && (
            <p className="text-xs text-muted-foreground">
              Nog een inleg open?{" "}
              <Link href="/app/pay" className="text-accent-brand underline underline-offset-2">
                Zo betaal je
              </Link>
              .
            </p>
          )}
        </section>
      )}

      {finished.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-medium text-muted-foreground">Erelijst</h2>
            <p className="text-xs tabular-nums text-muted-foreground">
              {finished.length} gespeeld
              {totalPrize > 0 && (
                <>
                  {" · "}
                  <span className="font-medium text-profit">€{money(totalPrize)}</span> prijzengeld
                </>
              )}
            </p>
          </div>

          {/* Titles get their own line. One gold disc, not one per win —
              identical discs repeated say nothing the count doesn't. */}
          {won.length > 0 && (
            <div
              className="flex items-center gap-3 rounded-lg border p-3"
              style={{ borderColor: `${MEDAL[0].color}59`, backgroundColor: `${MEDAL[0].color}0f` }}
            >
              <RankDisc rank={1} size={40} />
              <div className="min-w-0">
                <p className="text-sm font-semibold" style={{ color: MEDAL[0].color }}>
                  {won.length === 1 ? "Kampioen" : `${won.length}× kampioen`}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {won.map((r) => r.name).join(" · ")}
                </p>
              </div>
            </div>
          )}

          <div className="divide-y divide-border rounded-lg border border-border">
            {finished.map((r) => (
              <div key={r.challengeId} className="flex items-center gap-3 p-3">
                <RankDisc rank={r.finalRank!} />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/app/challenge/${r.slug}`}
                    className="truncate text-sm font-medium hover:underline"
                  >
                    {r.name}
                  </Link>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    #{r.finalRank} van de {r.playerCount} · €{money(r.balance)}
                  </p>
                </div>
                {r.prize > 0 && (
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-profit">
                    +€{money(r.prize)}
                  </span>
                )}
              </div>
            ))}
          </div>

          {isOwnProfile && totalPrize > 0 && (
            <p className="text-xs text-muted-foreground">
              Prijzengeld wordt buiten de app uitbetaald door de beheerder.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
