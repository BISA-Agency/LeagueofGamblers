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
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="truncate">{username}</span>
      <CountryFlag code={country} />
    </span>
  );
}
