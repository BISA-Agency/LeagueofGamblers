import { and, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setDailyMatch } from "@/actions/predictions-daily";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { formatEventTime } from "@/lib/format-event-time";
import {
  matchDayFor,
  pickableMatches,
  PREDICTION_REWARD_SHARE,
} from "@/lib/predictions/daily";
import { challenges, dailyMatches } from "@drizzle/schema";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Wedstrijd van de dag" };

const money = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 });

/**
 * Picks the fixture everyone guesses the score of today.
 *
 * Deliberately a choice rather than an automatic pick: the point of a match of
 * the day is that somebody thought it was worth watching. An algorithm would
 * choose the Championship game with the earliest kick-off.
 */
export default async function DailyMatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const challenge = await db.query.challenges.findFirst({ where: eq(challenges.id, id) });
  if (!challenge) notFound();

  const today = matchDayFor();
  const [current, options] = await Promise.all([
    db.query.dailyMatches.findFirst({
      where: and(eq(dailyMatches.challengeId, id), eq(dailyMatches.matchDay, today)),
      with: { event: true, predictions: true },
    }),
    pickableMatches(id),
  ]);

  const reward = Math.round(challenge.startingBalance * PREDICTION_REWARD_SHARE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Wedstrijd van de dag</h1>
        <p className="text-sm text-muted-foreground">
          Iedereen mag één keer de eindstand voorspellen. Goed = €{money.format(reward)} cadeau op
          het saldo, {Math.round(PREDICTION_REWARD_SHARE * 100)}% van de startinleg. Er is geen pot:
          raden er drie goed, dan krijgen ze het alle drie.
        </p>
      </div>

      {current ? (
        <div className="rounded-xl border border-accent-brand/40 bg-accent-brand/5 p-4">
          <p className="text-sm text-muted-foreground">Nu ingesteld voor vandaag</p>
          <p className="mt-0.5 text-lg font-semibold tracking-tight">{current.event.name}</p>
          <p className="mt-1 text-sm tabular-nums text-muted-foreground">
            {formatEventTime(current.event.startsAt)} · {current.predictions.length}{" "}
            {current.predictions.length === 1 ? "voorspelling" : "voorspellingen"}
          </p>
          {current.predictions.length > 0 && (
            <p className="mt-2 text-xs text-loss">
              Er is al gestemd — een andere wedstrijd kiezen laat die voorspellingen achter op een
              wedstrijd die niemand koos. Doe dat alleen als het echt moet.
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nog niets gekozen voor vandaag. Zolang er niets staat, ziet niemand de kaart op de
          homepage.
        </p>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          Wedstrijden van vandaag die nog moeten beginnen
        </h2>

        {options.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Geen wedstrijden meer vandaag. Morgen weer.
          </p>
        ) : (
          <div className="divide-y divide-border rounded-xl border border-border">
            {options.map((event) => {
              const isCurrent = current?.eventId === event.id;
              return (
                <div
                  key={event.id}
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-3 p-3",
                    isCurrent && "bg-accent-brand/5"
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{event.name}</p>
                    <p className="truncate text-xs tabular-nums text-muted-foreground">
                      {event.competition ?? event.sportLabel} · {formatEventTime(event.startsAt)}
                    </p>
                  </div>
                  {isCurrent ? (
                    <span className="shrink-0 text-xs font-medium text-accent-brand">
                      staat ingesteld
                    </span>
                  ) : (
                    <form action={setDailyMatch.bind(null, id, event.id)}>
                      <Button type="submit" size="sm" variant="outline" className="h-10">
                        Kies deze
                      </Button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
