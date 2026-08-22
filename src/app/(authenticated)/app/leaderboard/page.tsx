import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Leaderboard" };

export default function LeaderboardPage() {
  return (
    <ComingSoon
      title="Leaderboard"
      description="Het live klassement met saldo, ROI en winrate komt in Fase 1."
    />
  );
}
