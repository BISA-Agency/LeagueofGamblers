import { ImageResponse } from "next/og";
import { getSharedBet } from "@/lib/bets/shared-bet";
import { OgBetCard } from "@/lib/og/bet-card";
import { OG_SIZE } from "@/lib/og/frame";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const bet = await getSharedBet(id);
  if (!bet) return new Response("Niet gevonden", { status: 404 });

  return new ImageResponse(<OgBetCard bet={bet} />, OG_SIZE);
}
