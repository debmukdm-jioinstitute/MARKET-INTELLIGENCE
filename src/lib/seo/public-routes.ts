import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo/site-url";

type ChangeFrequency = NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;

/** Marketing, help, and legal pages only — portal routes stay behind sign-in. */
export const PUBLIC_SITEMAP_PATHS: { path: string; changeFrequency: ChangeFrequency; priority: number }[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/help", changeFrequency: "weekly", priority: 0.9 },
  { path: "/methodology", changeFrequency: "monthly", priority: 0.7 },
  { path: "/privacy", changeFrequency: "monthly", priority: 0.4 },
  { path: "/terms", changeFrequency: "monthly", priority: 0.4 },
  { path: "/connect/claude", changeFrequency: "monthly", priority: 0.5 },
];

export function buildSitemapEntries(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const now = new Date();
  return PUBLIC_SITEMAP_PATHS.map(({ path, changeFrequency, priority }) => ({
    url: `${base}${path === "/" ? "" : path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}

/** Paths that must not be indexed (product shell, auth, APIs). */
export const ROBOTS_DISALLOW_PREFIXES = [
  "/api/",
  "/admin",
  "/Home",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/onboarding",
  "/markets/",
  "/macro/",
  "/portfolio/",
  "/research/",
  "/intelligence/",
  "/data/",
  "/profile",
  "/algo",
  "/worldmonitor",
];
