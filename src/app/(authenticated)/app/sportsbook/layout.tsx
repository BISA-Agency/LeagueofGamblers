import { redirect } from "next/navigation";
import { BetSlipPanel } from "@/components/betslip/bet-slip-panel";
import { BetSlipSheet } from "@/components/betslip/bet-slip-sheet";
import { getActiveParticipation } from "@/lib/challenges/active";
import { BetSlipProvider } from "@/lib/betslip/context";
import { createClient } from "@/lib/supabase/server";

export default async function SportsbookLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { active } = await getActiveParticipation(user.id);
  const participation = active?.status === "active" ? active : null;

  /**
   * The provider wraps the page whether or not there is a bet slip to fill.
   *
   * It used to be mounted only for an active participation, and every odds
   * button below calls useBetSlip() — so anyone browsing without one crashed
   * the page instead of seeing the odds. That is not a rare state: a player
   * is "joined" until the challenge actually starts, so before kick-off day
   * it was everybody, and afterwards anyone who hasn't paid.
   *
   * Betting itself stays gated: no participation, no slip panel to submit
   * from, and placeSportsbookBet refuses it server-side regardless.
   */
  return (
    <BetSlipProvider canBet={participation !== null}>
      <div className="flex">
        <div className="min-w-0 flex-1">{children}</div>
        {participation && (
          <BetSlipPanel challengeId={participation.challengeId} balance={participation.balance} />
        )}
      </div>
      {participation && (
        <BetSlipSheet challengeId={participation.challengeId} balance={participation.balance} />
      )}
    </BetSlipProvider>
  );
}
