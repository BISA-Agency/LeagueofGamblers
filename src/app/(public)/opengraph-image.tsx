import { ImageResponse } from "next/og";
import { OG_COLORS, OG_SIZE, OgFrame, OgStat } from "@/lib/og/frame";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "League of Gamblers — de maandelijkse challenge voor je vriendengroep";

/** Share card for the landing page itself (Next's opengraph-image convention). */
export default async function Image() {
  return new ImageResponse(
    (
      <OgFrame>
        {/* Both lines wrapped in a flex column: Satori mis-measures a bare
            multi-line text node and prints the next line over it. */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 58, fontWeight: 700, lineHeight: 1.15, maxWidth: 1000 }}>
            €10.000 virtueel. Eén maand. Hoogste saldo wint de pot.
          </span>
          <span style={{ marginTop: 18, fontSize: 28, color: OG_COLORS.muted, maxWidth: 820 }}>
            De maandelijkse sportsbetting-challenge voor jouw vriendengroep.
          </span>
        </div>
        <div style={{ display: "flex", gap: 20, marginTop: 32 }}>
          <OgStat label="Startsaldo" value="€10.000" color={OG_COLORS.brand} />
          <OgStat label="Duur" value="1 maand" />
          <OgStat label="Winnaar" value="Pakt de pot" />
        </div>
      </OgFrame>
    ),
    size
  );
}
