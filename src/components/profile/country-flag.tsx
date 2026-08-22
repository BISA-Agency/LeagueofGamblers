import { countryName, isKnownCountry } from "@/lib/countries";
import { cn } from "@/lib/utils";

/**
 * Real SVG flag rather than the emoji: Windows renders regional-indicator
 * pairs as two letters (NL), which looks broken next to a username.
 *
 * A plain <img> on purpose — these are ~500-byte static SVGs, so routing them
 * through the image optimiser would cost a round-trip and save nothing.
 * Decorative: the country never carries meaning the username doesn't already,
 * so it stays out of the accessibility tree and shows on hover instead.
 */
export function CountryFlag({
  code,
  className,
}: {
  code: string | null | undefined;
  className?: string;
}) {
  if (!code || !isKnownCountry(code)) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/flags/${code.toLowerCase()}.svg`}
      alt=""
      width={18}
      height={12}
      loading="lazy"
      decoding="async"
      title={countryName(code)}
      className={cn(
        "inline-block h-3 w-[18px] shrink-0 rounded-[2px] object-cover align-[-1px] ring-1 ring-white/15",
        className
      )}
    />
  );
}
