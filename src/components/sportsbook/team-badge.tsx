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

// Same deterministic-color approach as the player GeneratedAvatar, applied to
// team names — no logo API, but every team still reads as a distinct "chip".
export function TeamBadge({ name, size = 22 }: { name: string; size?: number }) {
  const color = PALETTE[hashString(name) % PALETTE.length];
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
