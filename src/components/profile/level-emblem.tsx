import { TIERS, type Tier } from "@/lib/levels";

/**
 * One emblem per tier, riding next to the username the way the flag does.
 *
 * Two things carry the rank, not one: the material (stone, bronze, silver,
 * gold, platinum, diamond) and the silhouette (disc, block, hexagon, shield,
 * star, gem). Colour alone would collapse for a colour-blind reader and at the
 * 16px this usually renders at, so the shape has to say it too.
 */
type EmblemStyle = {
  from: string;
  to: string;
  stroke: string;
  /** The shape itself, drawn in a 24x24 box. */
  path: string;
  /** Optional facets drawn on top, for the tiers that earn the extra detail. */
  detail?: string;
};

const STYLES: Record<Tier, EmblemStyle> = {
  Rookie: {
    from: "#7d7d7d",
    to: "#4a4a4a",
    stroke: "#3a3a3a",
    path: "M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17Z",
    // A bare disc beside a flag reads as a bullet or a loading dot; the inner
    // ring is enough to say "this is a rank".
    detail: "M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z",
  },
  Punter: {
    from: "#e09b52",
    to: "#8c5522",
    stroke: "#6b3f18",
    path: "M6.5 4h11a2.5 2.5 0 0 1 2.5 2.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11A2.5 2.5 0 0 1 6.5 4Z",
    detail: "M9 9h6v6H9z",
  },
  Grinder: {
    from: "#e8ecf1",
    to: "#98a0a9",
    stroke: "#6f767e",
    path: "M12 2.5l8.2 4.75v9.5L12 21.5 3.8 16.75v-9.5L12 2.5Z",
    detail: "M12 6.5l4.8 2.8v5.4L12 17.5l-4.8-2.8V9.3L12 6.5Z",
  },
  Sharp: {
    from: "#ffd968",
    to: "#c9922a",
    stroke: "#8f6414",
    path: "M12 2.2l8 3.3v6.2c0 4.6-3.4 7.9-8 10.1-4.6-2.2-8-5.5-8-10.1V5.5l8-3.3Z",
    detail: "M12 6.4l1.7 3.6 3.8.5-2.8 2.7.7 3.9-3.4-1.9-3.4 1.9.7-3.9-2.8-2.7 3.8-.5L12 6.4Z",
  },
  Whale: {
    from: "#f2f9ff",
    to: "#8fb8d4",
    stroke: "#5e87a5",
    path: "M12 1.8l3 6.6 7.2.8-5.4 4.9 1.5 7.1L12 17.6l-6.3 3.6 1.5-7.1L1.8 9.2 9 8.4l3-6.6Z",
  },
  Legend: {
    from: "#e4fbff",
    to: "#37b6d8",
    stroke: "#1d7f9c",
    path: "M12 1.6l9.4 8.1L12 22.4 2.6 9.7 12 1.6Z",
    detail: "M2.6 9.7h18.8M12 1.6 8.4 9.7 12 22.4l3.6-12.7L12 1.6Z",
  },
};

export function LevelEmblem({
  tier,
  size = 16,
  title,
  className,
}: {
  tier: Tier;
  size?: number;
  /** Tooltip text, normally the full "Grinder 7". */
  title?: string;
  className?: string;
}) {
  const style = STYLES[tier];
  const id = `emblem-${tier.toLowerCase()}`;
  const isLegend = tier === "Legend";

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={title ?? tier}
    >
      {title && <title>{title}</title>}
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={style.from} />
          <stop offset="100%" stopColor={style.to} />
        </linearGradient>
      </defs>

      {/* Only the top tier gets a halo. If everything glows, nothing does. */}
      {isLegend && <path d={style.path} fill={style.from} opacity="0.28" transform="scale(1.12) translate(-1.3 -1.3)" />}

      <path d={style.path} fill={`url(#${id})`} stroke={style.stroke} strokeWidth="1" strokeLinejoin="round" />
      {style.detail && (
        <path
          d={style.detail}
          fill="none"
          stroke={style.stroke}
          strokeWidth="0.9"
          strokeLinejoin="round"
          opacity="0.55"
        />
      )}
    </svg>
  );
}

export function tierFromIndex(index: number): Tier {
  return TIERS[Math.max(0, Math.min(TIERS.length - 1, index))];
}
