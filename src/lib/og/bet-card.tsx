import { slipStatusOf } from "@/components/bets/slip-chrome";
import type { SharedBet } from "@/lib/bets/shared-bet";
import { OG_COLORS, OgFrame, ogMoney } from "./frame";

/** What the big number means, said above it so the amount needs no unit. */
const STATUS_KICKER = {
  won: "GEWONNEN",
  lost: "VERLOREN",
  void: "TERUGBETAALD",
  open: "MOGELIJKE UITBETALING",
  sealed: "VERZEGELD",
} as const;

const STATUS_COLOR = {
  won: OG_COLORS.profit,
  lost: OG_COLORS.loss,
  void: OG_COLORS.muted,
  open: OG_COLORS.brand,
  sealed: OG_COLORS.muted,
} as const;

/** Long fixture names must not push the odds off the card. */
const CLIP = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } as const;

/** How many legs fit before the card starts to crowd. */
const MAX_LEGS = 3;

/**
 * The share card for a single slip. Kept apart from the route that serves it
 * so it can be rendered with fabricated data while checking the layout —
 * Satori mistakes only show up in the pixels.
 */
export function OgBetCard({ bet }: { bet: SharedBet }) {
  const status = slipStatusOf(bet.status);
  // The number that makes someone stop scrolling: what it paid, what it cost,
  // or — while it's still running — what it stands to pay.
  const headline =
    status === "won"
      ? `+€${ogMoney.format(bet.potentialPayout)}`
      : status === "lost"
        ? `−€${ogMoney.format(bet.stake)}`
        : `€${ogMoney.format(status === "open" ? bet.potentialPayout : bet.stake)}`;

  const legs = bet.selections.slice(0, MAX_LEGS);
  const hidden = bet.selections.length - legs.length;

  return (
    <OgFrame>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 10, fontSize: 27 }}>
        <span style={{ fontWeight: 600 }}>{bet.user.username}</span>
        <span style={{ color: OG_COLORS.border }}>|</span>
        <span style={{ color: OG_COLORS.muted }}>{bet.challenge.name}</span>
      </div>

      {/* Wrapped in its own flex column: Satori mis-measures the height of a
          bare text node sitting directly in a column, and the big number ends
          up printed over the line beneath it. */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: 16,
          color: STATUS_COLOR[status],
        }}
      >
        <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: 3 }}>
          {STATUS_KICKER[status]}
        </span>
        <span style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.15 }}>{headline}</span>
      </div>

      <div style={{ display: "flex", gap: 16, marginTop: 6, fontSize: 27, color: OG_COLORS.muted }}>
        <span>
          {bet.type === "combi" ? `Combi · ${bet.selections.length} selecties` : "Single"}
        </span>
        <span>·</span>
        <span>€{ogMoney.format(bet.stake)} inzet</span>
        <span>·</span>
        <span style={{ color: OG_COLORS.foreground }}>{bet.totalOdds.toFixed(2)} odds</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 20 }}>
        {legs.map((leg) => (
          <div
            key={leg.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 24,
              paddingBottom: 6,
              borderBottom: `1px solid ${OG_COLORS.border}`,
              fontSize: 24,
            }}
          >
            <span style={{ flex: 1, fontWeight: 600, ...CLIP }}>{leg.selectionLabel}</span>
            <span style={{ maxWidth: 460, color: OG_COLORS.muted, ...CLIP }}>{leg.eventName}</span>
            <span style={{ width: 90, textAlign: "right" }}>{leg.odds.toFixed(2)}</span>
          </div>
        ))}
        {hidden > 0 && (
          <span style={{ marginTop: 2, fontSize: 24, color: OG_COLORS.muted }}>+{hidden} meer</span>
        )}
      </div>
    </OgFrame>
  );
}
