import { countryFlag, countryName } from "@/lib/countries";

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
  const flag = countryFlag(country);
  return (
    <span className={className}>
      {username}
      {flag && (
        <span title={countryName(country!)} className="ml-1">
          {flag}
        </span>
      )}
    </span>
  );
}
