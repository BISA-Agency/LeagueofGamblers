/**
 * Dutch sport label (what lands in events.sportLabel, via SPORT_GROUP_LABELS)
 * to the Tabler outline icon that stands for it. The SVGs are copied into
 * public/sports/ by `npm run sport-icons` and committed — Tabler is a
 * devDependency, the files are the artifact, same arrangement as the flags.
 *
 * Two deliberate collisions: Tabler has no boxing glove, so boxing borrows the
 * karate figure; and it has no rugby ball, so rugby and Aussie rules borrow
 * the (equally oval) American football.
 */
export const SPORT_ICONS: Record<string, string> = {
  Voetbal: "ball-football",
  Basketbal: "ball-basketball",
  Tennis: "ball-tennis",
  "American football": "ball-american-football",
  MMA: "karate",
  Boksen: "karate",
  IJshockey: "ice-skating",
  Honkbal: "ball-baseball",
  Golf: "golf",
  Cricket: "cricket",
  Rugby: "ball-american-football",
  "Aussie rules": "ball-american-football",
  Politiek: "gavel",
  Handmatig: "pencil",
};

export function sportIconSlug(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Path under public/, or null when we ship no icon for this sport. */
export function sportIconPath(label: string): string | null {
  return SPORT_ICONS[label] ? `/sports/${sportIconSlug(label)}.svg` : null;
}
