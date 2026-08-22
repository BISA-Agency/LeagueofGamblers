import { eq } from "drizzle-orm";
import { PredictionPicker } from "@/components/challenges/prediction-picker";
import { db } from "@/lib/db";
import { predictions } from "@drizzle/schema";
import type { Challenge } from "@drizzle/schema";

type Player = { userId: string; username: string };

/**
 * Before the challenge starts everyone privately calls the winner; once it's
 * live the picks are locked and shown, so the field can see who backed whom.
 */
export async function PredictionSection({
  challenge,
  players,
  currentUserId,
}: {
  challenge: Challenge;
  players: Player[];
  currentUserId: string;
}) {
  if (challenge.status === "draft" || players.length < 2) return null;

  const rows = await db.query.predictions.findMany({
    where: eq(predictions.challengeId, challenge.id),
    with: {
      user: { columns: { username: true } },
      predictedWinner: { columns: { username: true } },
    },
  });

  const isOpen = challenge.status === "open";
  const mine = rows.find((r) => r.userId === currentUserId);

  if (isOpen) {
    const others = rows.filter((r) => r.userId !== currentUserId).length;
    return (
      <section className="space-y-2 rounded-lg border border-border p-4">
        <h2 className="text-sm font-medium">Wie wint deze challenge?</h2>
        <p className="text-xs text-muted-foreground">
          Voorspellingen blijven verborgen tot de challenge begint. Daarna liggen ze vast.
        </p>
        <PredictionPicker
          challengeId={challenge.id}
          players={players.filter((p) => p.userId !== currentUserId)}
          current={mine?.predictedWinnerId ?? null}
        />
        {others > 0 && (
          <p className="text-xs text-muted-foreground">
            {others} {others === 1 ? "andere speler heeft" : "andere spelers hebben"} al gestemd.
          </p>
        )}
      </section>
    );
  }

  if (rows.length === 0) return null;

  const tally = new Map<string, number>();
  for (const r of rows) {
    tally.set(r.predictedWinner.username, (tally.get(r.predictedWinner.username) ?? 0) + 1);
  }
  const ordered = [...tally.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <section className="space-y-2 rounded-lg border border-border p-4">
      <h2 className="text-sm font-medium">Voorspellingen</h2>
      <ul className="space-y-1 text-sm">
        {ordered.map(([username, votes]) => (
          <li key={username} className="flex items-center justify-between gap-2">
            <span className="truncate">{username}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {votes} {votes === 1 ? "stem" : "stemmen"}
            </span>
          </li>
        ))}
      </ul>
      {mine && (
        <p className="text-xs text-muted-foreground">
          Jij koos {mine.predictedWinner.username}.
        </p>
      )}
    </section>
  );
}
