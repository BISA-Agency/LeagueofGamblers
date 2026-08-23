import { getLevelInfo } from "@/lib/levels";
import { cn } from "@/lib/utils";
import { CountryFlag } from "./country-flag";
import { LevelEmblem } from "./level-emblem";

/**
 * "professional_risktaker 🇳🇱 ◆" — flag and rank emblem ride along wherever a
 * username shows, so you can read who you are up against straight off a
 * leaderboard row without opening a profile.
 *
 * Both are optional: a call site that has no level data simply renders the
 * name, rather than every list needing to grow a join first.
 */
export function UsernameWithFlag({
  username,
  country,
  xp,
  levelFloor,
  className,
}: {
  username: string;
  country: string | null | undefined;
  xp?: number | null;
  levelFloor?: number | null;
  className?: string;
}) {
  const level = typeof xp === "number" ? getLevelInfo(xp, levelFloor ?? 1) : null;

  return (
    // min-w-0 so the truncating child can actually shrink inside a flex
    // parent — without it a long username pushes past its container.
    <span className={cn("inline-flex min-w-0 max-w-full items-center gap-1.5", className)}>
      <span className="truncate">{username}</span>
      <CountryFlag code={country} />
      {level && <LevelEmblem tier={level.tier} title={level.label} className="shrink-0" />}
    </span>
  );
}
