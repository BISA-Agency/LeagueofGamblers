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

  if (!participation) {
    return <div className="mx-auto max-w-2xl">{children}</div>;
  }

  return (
    <BetSlipProvider>
      <div className="flex">
        <div className="min-w-0 flex-1">{children}</div>
        <BetSlipPanel challengeId={participation.challengeId} balance={participation.balance} />
      </div>
      <BetSlipSheet challengeId={participation.challengeId} balance={participation.balance} />
    </BetSlipProvider>
  );
}
