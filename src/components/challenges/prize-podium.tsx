import { cn } from "@/lib/utils";

const money = new Intl.NumberFormat("nl-NL", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

// Medal colours are fixed, not theme tokens: gold/silver/bronze only read as
// a podium if they're actually those colours, whatever the accent theme is.
const PLACES = [
  { rank: 2, label: "Tweede", color: "#cfd4d9", rgb: "207,212,217", height: "h-16", order: "order-1" },
  { rank: 1, label: "Winnaar", color: "#f5c74a", rgb: "245,199,74", height: "h-24", order: "order-2" },
  { rank: 3, label: "Derde", color: "#d18f56", rgb: "209,143,86", height: "h-12", order: "order-3" },
] as const;

/**
 * The pot as a podium: silver, gold, bronze, winner raised in the middle.
 *
 * Places the current staffel doesn't pay out still render, at €0 — with two
 * to six players the winner takes everything, and seeing the empty second and
 * third step makes it obvious that they fill up as the group grows.
 */
export function PrizePodium({
  split,
  className,
}: {
  split: { rank: number; amount: number }[];
  className?: string;
}) {
  const amountFor = (rank: number) => split.find((s) => s.rank === rank)?.amount ?? 0;

  // Above three places the podium tells only part of the story. In a field of
  // 400 the prize pool runs 48 deep, and someone heading for 20th should know
  // there is something waiting there.
  const deeper = split.filter((s) => s.rank > 3);
  const smallest = deeper.at(-1)?.amount ?? 0;

  return (
    <div className={cn("space-y-3", className)}>
    <div className="flex items-end justify-center gap-2 sm:gap-3">
      {PLACES.map((place) => {
        const amount = amountFor(place.rank);
        const empty = amount === 0;

        return (
          <div
            key={place.rank}
            className={cn("flex min-w-0 flex-1 flex-col items-center", place.order)}
          >
            <p
              className={cn(
                "text-lg font-semibold tabular-nums sm:text-xl",
                empty && "text-muted-foreground/50"
              )}
              style={empty ? undefined : { color: place.color }}
            >
              €{money.format(amount)}
            </p>
            <p
              className={cn(
                "mb-1.5 text-[11px]",
                empty ? "text-muted-foreground/50" : "text-muted-foreground"
              )}
            >
              {place.label}
            </p>

            {/* Fill stays faint and fades upward — the border and the amount
                carry the medal colour. A flat tint at full strength turns
                muddy brown on a dark background. */}
            <div
              className={cn(
                "flex w-full items-end justify-center rounded-t-md border border-b-0 pb-2 text-sm font-semibold",
                place.height
              )}
              style={{
                borderColor: empty ? "var(--border)" : `rgba(${place.rgb},0.55)`,
                background: empty
                  ? "linear-gradient(to top, rgba(255,255,255,0.04), transparent)"
                  : `linear-gradient(to top, rgba(${place.rgb},0.18), rgba(${place.rgb},0.02))`,
                color: empty ? "var(--muted-foreground)" : place.color,
              }}
            >
              {place.rank}
            </div>
          </div>
        );
      })}
    </div>

      {deeper.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          En nog {deeper.length} {deeper.length === 1 ? "plek" : "plekken"} in de prijzen, tot en
          met #{split.length} voor €{money.format(smallest)}.
        </p>
      )}
    </div>
  );
}
