import type { ReactNode } from "react";

// Satori (what ImageResponse renders with) supports flexbox only — no grid,
// and every multi-child element needs an explicit display: flex.
export const OG_SIZE = { width: 1200, height: 630 };

export const OG_COLORS = {
  background: "#09090b",
  foreground: "#fafafa",
  muted: "#a1a1aa",
  border: "#27272a",
  brand: "#a3e635",
  profit: "#4ade80",
  loss: "#f87171",
};

export function OgFrame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        padding: 64,
        background: OG_COLORS.background,
        color: OG_COLORS.foreground,
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", fontSize: 30, fontWeight: 600 }}>
        <span>League of&nbsp;</span>
        <span style={{ color: OG_COLORS.brand }}>Gamblers</span>
      </div>
      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function OgStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: "20px 28px",
        border: `1px solid ${OG_COLORS.border}`,
        borderRadius: 16,
        minWidth: 220,
      }}
    >
      <span style={{ fontSize: 22, color: OG_COLORS.muted }}>{label}</span>
      <span style={{ fontSize: 44, fontWeight: 600, color: color ?? OG_COLORS.foreground }}>
        {value}
      </span>
    </div>
  );
}

export const ogMoney = new Intl.NumberFormat("nl-NL", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
