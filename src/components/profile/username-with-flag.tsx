import { CountryFlag } from "./country-flag";
import { cn } from "@/lib/utils";

/** "professional_risktaker 🇳🇱" — the flag rides along wherever a username shows. */
export function UsernameWithFlag({
  username,
  country,
  className,
}: {
  username: string;
  country: string | null | undefined;
  className?: string;
}) {
  return (
    // min-w-0 so the truncating child can actually shrink inside a flex
    // parent — without it a long username pushes past its container.
    <span className={cn("inline-flex min-w-0 max-w-full items-center gap-1.5", className)}>
      <span className="truncate">{username}</span>
      <CountryFlag code={country} />
    </span>
  );
}
