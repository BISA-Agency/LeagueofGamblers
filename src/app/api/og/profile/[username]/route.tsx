import { eq } from "drizzle-orm";
import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { getLevelInfo } from "@/lib/levels";
import { OG_COLORS, OG_SIZE, OgFrame, OgStat, ogMoney } from "@/lib/og/frame";
import { profiles } from "@drizzle/schema";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.username, username.toLowerCase()),
    with: {
      badges: true,
      participations: { with: { challenge: { columns: { name: true } } } },
    },
  });
  if (!profile) return new Response("Niet gevonden", { status: 404 });

  const level = getLevelInfo(profile.xp);
  const active = profile.participations.find((p) => p.status === "active");

  return new ImageResponse(
    (
      <OgFrame>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 76, fontWeight: 700 }}>{profile.username}</span>
          <span style={{ fontSize: 34, color: OG_COLORS.muted }}>
            {level.label}
          </span>
        </div>
        <div style={{ display: "flex", gap: 20, marginTop: 44 }}>
          <OgStat label="XP" value={`${profile.xp}`} />
          <OgStat label="Badges" value={`${profile.badges.length}`} />
          {active && (
            <OgStat label="Saldo" value={`€${ogMoney.format(active.balance)}`} />
          )}
        </div>
        {active && (
          <span style={{ fontSize: 26, color: OG_COLORS.muted, marginTop: 28 }}>
            {active.challenge.name}
          </span>
        )}
      </OgFrame>
    ),
    OG_SIZE
  );
}
