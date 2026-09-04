import { Trophy } from "lucide-react";
import { flagPath } from "@/lib/sportsbook/competitions";
import { cn } from "@/lib/utils";

/**
 * The flag, or a trophy in the same rectangle for anything supranational — a
 * Champions League night belongs to no country, and forcing one on it would be
 * wrong as well as ugly.
 *
 * Its own file so both the rail (server) and the country menu (client) can use
 * it without importing each other.
 */
export function CompetitionCrest({
  country,
  className,
}: {
  country: string | null;
  className?: string;
}) {
  const flag = flagPath(country);
  if (flag) {
    return (
      // Plain <img>: these are tiny local SVGs, and next/image would add a
      // request to the optimiser for something already 400 bytes.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={flag}
        alt=""
        aria-hidden
        className={cn(
          "h-3.5 w-5 shrink-0 rounded-[2px] object-cover ring-1 ring-white/15",
          className
        )}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-3.5 w-5 shrink-0 items-center justify-center rounded-[2px] bg-secondary ring-1 ring-white/10",
        className
      )}
    >
      <Trophy className="size-2.5 text-muted-foreground" />
    </span>
  );
}
