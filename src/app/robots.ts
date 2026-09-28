import type { MetadataRoute } from "next";
import { ROBOTS_DISALLOW_PREFIXES } from "@/lib/seo/public-routes";
import { siteUrl } from "@/lib/seo/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ROBOTS_DISALLOW_PREFIXES,
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
