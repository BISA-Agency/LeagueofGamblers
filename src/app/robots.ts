import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

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
