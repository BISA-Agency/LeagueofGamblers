import { ImageResponse } from "next/og";
import { getWrappedData } from "@/lib/challenges/wrapped";
import { OG_COLORS, OG_SIZE, OgFrame, OgStat, ogMoney } from "@/lib/og/frame";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ challengeId: string; username: string }> }
) {
  const { challengeId, username } = await params;
  const data = await getWrappedData(challengeId, username);
  if (!data) return new Response("Niet gevonden", { status: 404 });

  const plColor = data.pl >= 0 ? OG_COLORS.profit : OG_COLORS.loss;

  return new ImageResponse(
    (
      <OgFrame>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 26, color: OG_COLORS.brand, letterSpacing: 2 }}>
            {data.challenge.name.toUpperCase()}
          </span>
          <span style={{ fontSize: 76, fontWeight: 700 }}>{data.profile.username}</span>
          <span style={{ fontSize: 34, color: OG_COLORS.muted }}>
            #{data.rank} van {data.playerCount} spelers
          </span>
        </div>
        <div style={{ display: "flex", gap: 20, marginTop: 44 }}>
          <OgStat label="Eindsaldo" value={`€${ogMoney.format(data.balance)}`} />
          <OgStat
            label="Winst/verlies"
            value={`${data.pl >= 0 ? "+" : "−"}€${ogMoney.format(Math.abs(data.pl))}`}
            color={plColor}
          />
          <OgStat label="Winrate" value={`${data.winrate.toFixed(0)}%`} />
        </div>
      </OgFrame>
    ),
    OG_SIZE
  );
}
