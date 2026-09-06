import { CREST_SLUGS } from "@/lib/sportsbook/crests";

const PALETTE = [
  "#7c3aed",
  "#2563eb",
  "#0891b2",
  "#059669",
  "#65a30d",
  "#ca8a04",
  "#ea580c",
  "#db2777",
];

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/** Stable colour for any name — shared with the sportsbook category rail. */
export function colorForName(name: string): string {
  return PALETTE[hashString(name) % PALETTE.length];
}

/** Must match scripts/fetch-crests.ts, or a downloaded crest never gets found. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Whether a crest was downloaded for this name — used to size a row ahead of time. */
export function hasCrest(name: string): boolean {
  return CREST_SLUGS.has(slugify(name));
}

/**
 * A club's crest where we have one, a coloured initial where we don't.
 *
 * The fallback is not a placeholder to be got rid of: more than half the names
 * in this app are people — tennis players, boxers, fighters — and a person has
 * no crest. The lettered square stays their badge, and it does the job, which
 * is to make two rows tell themselves apart at a glance.
 *
 * Crests are checked against a generated list rather than pointed at
 * optimistically, because a broken image icon on every unknown club would look
 * far worse than the square it replaced.
 */
export function TeamBadge({ name, size = 22 }: { name: string; size?: number }) {
  const slug = slugify(name);

  if (CREST_SLUGS.has(slug)) {
    return (
      // Plain <img>: these are already tiny files served from our own domain,
      // and the optimiser would add a request per crest for nothing.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/crests/${slug}.webp`}
        alt=""
        aria-hidden
        width={size}
        height={size}
        loading="lazy"
        className="shrink-0 object-contain"
        style={{ width: size, height: size }}
      />
    );
  }

  const color = colorForName(name);
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-md text-[10px] font-semibold text-white"
      style={{ width: size, height: size, backgroundColor: color }}
      aria-hidden
    >
      {initial}
    </span>
  );
}
