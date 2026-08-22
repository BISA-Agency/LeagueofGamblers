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
        <span style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.1, maxWidth: 900 }}>
          €10.000 virtueel. Eén maand. Hoogste saldo wint de pot.
        </span>
        <span style={{ fontSize: 30, color: OG_COLORS.muted, marginTop: 24, maxWidth: 820 }}>
          De maandelijkse sportsbetting-challenge voor jouw vriendengroep.
        </span>
        <div style={{ display: "flex", gap: 20, marginTop: 40 }}>
          <OgStat label="Startsaldo" value="€10.000" color={OG_COLORS.brand} />
          <OgStat label="Duur" value="1 maand" />
          <OgStat label="Winnaar" value="Pakt de pot" />
        </div>
      </OgFrame>
    ),
    size
  );
}
