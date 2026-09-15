import { BountyMatchRow } from "./bounty-match-row";
import type { BountyRoundView } from "@/lib/bounties/view";

const money = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 });

export function BountyRoundCard({ round }: { round: BountyRoundView }) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <header className="border-b border-border px-4 py-2.5">
        <p className="text-sm font-medium">
          🎯 Bounty op {round.bustedUsername} — €{money.format(round.payoutAmount)}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Voorspel {round.matches.length} wedstrijden van morgen. Exacte uitslag = 3 punten, juiste winnaar = 1
          punt. Hoogste score wint de bounty; bij gelijke stand wordt hij verdeeld.
        </p>
      </header>
      {round.matches.map((match) => (
        <BountyMatchRow key={match.bountyRoundMatchId} match={match} />
      ))}
    </section>
  );
}
