import { TrendingUp } from "lucide-react";
import { CountryFlag } from "@/components/profile/country-flag";
import { PhoneFrame } from "./phone-frame";

/**
 * Hero composition: the real app in a phone, with a floating standings card
 * overlapping it. The card is markup rather than part of the screenshot, so it
 * stays crisp at any size and can be reworded without a new capture.
 */
const STANDINGS = [
  { rank: 1, name: "sam_underdog", country: "NL", balance: "€16.646", delta: "+66%" },
  { rank: 2, name: "mo_sharp", country: "MA", balance: "€15.277", delta: "+53%" },
  { rank: 3, name: "noor_streak", country: "NL", balance: "€13.641", delta: "+36%" },
];

export function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-sm md:max-w-none">
      <div
        aria-hidden
        className="absolute inset-x-4 top-8 -z-10 h-3/4 rounded-full bg-accent-brand/20 blur-3xl"
      />

      <PhoneFrame
        src="/screenshots/home-mobile.png"
        alt="De tijdlijn van een lopende challenge in de app"
        priority
        className="max-w-[250px] sm:max-w-[280px]"
      />

      {/* Tucked under the phone on small screens, alongside it from md up. */}
      <div className="mx-auto -mt-10 w-[min(20rem,100%)] rounded-xl border border-border bg-card/95 p-3 shadow-2xl shadow-black/60 backdrop-blur md:absolute md:-right-2 md:bottom-10 md:mt-0 lg:-right-10">
        <div className="mb-2 flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
          <TrendingUp className="size-3.5 text-accent-brand" />
          Stand na twee weken
        </div>
        <ul className="space-y-0.5">
          {STANDINGS.map((row) => (
            <li
              key={row.rank}
              className="flex items-center gap-2 rounded-md px-1 py-1.5 text-sm"
            >
              <span className="w-4 text-center text-xs text-muted-foreground">{row.rank}</span>
              <span className="flex min-w-0 flex-1 items-center gap-1.5">
                <span className="truncate">{row.name}</span>
                <CountryFlag code={row.country} />
              </span>
              <span className="shrink-0 font-medium tabular-nums">{row.balance}</span>
              <span className="w-12 shrink-0 text-right text-xs tabular-nums text-profit">
                {row.delta}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
