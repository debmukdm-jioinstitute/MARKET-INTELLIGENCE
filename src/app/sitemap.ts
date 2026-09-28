import type { MetadataRoute } from "next";
import { buildSitemapEntries } from "@/lib/seo/public-routes";

export default function sitemap(): MetadataRoute.Sitemap {
  return buildSitemapEntries();
}
