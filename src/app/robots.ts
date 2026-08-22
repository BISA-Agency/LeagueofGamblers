import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

const siteUrl = getSiteUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Everything behind login is worthless to a crawler, and wrapped pages
      // are personal recaps meant to be shared by link, not indexed.
      disallow: ["/app/", "/admin/", "/auth/", "/api/", "/wrapped/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
