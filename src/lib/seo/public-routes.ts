import type { MetadataRoute } from "next";
import { NIFTY_500 } from "@/lib/prowess/nifty500";
import { LEARN_ARTICLES } from "@/lib/learn/articles";
import { siteUrl } from "@/lib/seo/site-url";

type ChangeFrequency = NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;

const PRIVATE_PORTAL_PREFIXES = ["/portfolio", "/profile", "/algo", "/onboarding"] as const;

const GUEST_PORTAL_PREFIXES = [
  "/Home",
  "/research",
  "/research-reports",
  "/markets",
  "/macro",
  "/intelligence",
  "/data",
] as const;

/** Guest-readable portal paths (Option A — public research & market hubs). */
export function isGuestReadablePortalPath(pathname: string): boolean {
  if (PRIVATE_PORTAL_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return false;
  }
  return GUEST_PORTAL_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export const PUBLIC_SITEMAP_STATIC: { path: string; changeFrequency: ChangeFrequency; priority: number }[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/research", changeFrequency: "daily", priority: 0.95 },
  { path: "/research/ipo", changeFrequency: "daily", priority: 0.9 },
  { path: "/research/offers", changeFrequency: "daily", priority: 0.85 },
  { path: "/markets", changeFrequency: "hourly", priority: 0.9 },
  { path: "/markets/india", changeFrequency: "hourly", priority: 0.85 },
  { path: "/macro", changeFrequency: "daily", priority: 0.85 },
  { path: "/intelligence", changeFrequency: "hourly", priority: 0.8 },
  { path: "/intelligence/scanner", changeFrequency: "daily", priority: 0.85 },
  { path: "/intelligence/brief", changeFrequency: "daily", priority: 0.85 },
  { path: "/intelligence/ai-signals", changeFrequency: "daily", priority: 0.75 },
  { path: "/learn", changeFrequency: "weekly", priority: 0.8 },
  { path: "/help", changeFrequency: "weekly", priority: 0.7 },
  { path: "/methodology", changeFrequency: "monthly", priority: 0.7 },
  { path: "/privacy", changeFrequency: "monthly", priority: 0.4 },
  { path: "/terms", changeFrequency: "monthly", priority: 0.4 },
  { path: "/connect/claude", changeFrequency: "monthly", priority: 0.5 },
];

const SITEMAP_SYMBOL_CAP = 200;

export function sitemapSymbolPaths(): string[] {
  const symbols = NIFTY_500.map(([sym]) => sym)
    .filter((sym) => !sym.startsWith("DUMMY"))
    .slice(0, SITEMAP_SYMBOL_CAP);
  return symbols.map((sym) => `/research/${encodeURIComponent(sym)}`);
}

export function buildSitemapEntries(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const now = new Date();
  const paths = [
    ...PUBLIC_SITEMAP_STATIC.map((s) => s.path),
    ...LEARN_ARTICLES.map((a) => `/learn/${a.slug}`),
    ...sitemapSymbolPaths(),
  ];

  const metaByPath = new Map(PUBLIC_SITEMAP_STATIC.map((s) => [s.path, s]));

  return paths.map((path) => {
    const staticMeta = metaByPath.get(path);
    const url = `${base}${path === "/" ? "" : path}`;
    return {
      url,
      lastModified: now,
      changeFrequency: staticMeta?.changeFrequency ?? (path.startsWith("/research/") ? "daily" : "weekly"),
      priority: staticMeta?.priority ?? (path.startsWith("/research/") ? 0.7 : 0.6),
    };
  });
}

/** Paths that must not be indexed (auth, APIs, private product areas). */
export const ROBOTS_DISALLOW_PREFIXES = [
  "/api/",
  "/admin",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/onboarding",
  "/portfolio/",
  "/profile",
  "/algo",
  "/worldmonitor",
];
