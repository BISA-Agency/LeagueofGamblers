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

// Deterministic placeholder avatar (same username -> same look), used until a
// player uploads a real avatar (Fase 1, once Storage buckets exist).
export function GeneratedAvatar({
  username,
  size = 40,
  className,
}: {
  username: string;
  size?: number;
  className?: string;
}) {
  const color = PALETTE[hashString(username) % PALETTE.length];
  const initial = username.trim().charAt(0).toUpperCase() || "?";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role="img"
      aria-label={`Avatar van ${username}`}
      className={className}
    >
      <rect width="40" height="40" rx="10" fill={color} />
      <text
        x="20"
        y="21"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="18"
        fontWeight="600"
        fill="white"
      >
        {initial}
      </text>
    </svg>
  );
}
