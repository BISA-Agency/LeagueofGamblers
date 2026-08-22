import { and, eq } from "drizzle-orm";
import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { OG_COLORS, OG_SIZE, OgFrame, ogMoney } from "@/lib/og/frame";
import { challengeParticipants, challenges } from "@drizzle/schema";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  const { challengeId } = await params;

  const challenge = await db.query.challenges.findFirst({
    where: eq(challenges.id, challengeId),
  });
  if (!challenge) return new Response("Niet gevonden", { status: 404 });

  const participants = await db.query.challengeParticipants.findMany({
    where: and(
      eq(challengeParticipants.challengeId, challengeId),
      eq(challengeParticipants.paidBuyIn, true)
    ),
    with: { user: { columns: { username: true } } },
  });
  const top = [...participants].sort((a, b) => b.balance - a.balance).slice(0, 5);

  return new ImageResponse(
    (
      <OgFrame>
        <span style={{ fontSize: 26, color: OG_COLORS.brand, letterSpacing: 2 }}>
          {challenge.name.toUpperCase()}
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
          {top.map((p, i) => (
            <div
              key={p.userId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 24,
                fontSize: 40,
                paddingBottom: 10,
                borderBottom: `1px solid ${OG_COLORS.border}`,
              }}
            >
              <span style={{ width: 48, color: OG_COLORS.muted }}>{i + 1}</span>
              <span style={{ flex: 1, fontWeight: 600 }}>{p.user.username}</span>
              <span>€{ogMoney.format(p.balance)}</span>
            </div>
          ))}
        </div>
      </OgFrame>
    ),
    OG_SIZE
  );
}
