import type { MetadataRoute } from "next";
import { NIFTY_500 } from "@/lib/prowess/nifty500";
import { LEARN_MODULES } from "@/lib/learn/curriculum";
import { HUBS } from "@/lib/hubs";
import { siteUrl } from "@/lib/seo/site-url";

type ChangeFrequency = NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;

const PRIVATE_PORTAL_PREFIXES = ["/portfolio", "/profile", "/onboarding"] as const;

/** Hub roots and the deep routes that still exist (company pages, country macro, deep tools). Old section URLs are in legacy-routes.ts and are not listed here. */
const GUEST_PORTAL_PREFIXES = [...Object.values(HUBS).map((h) => h.route), "/loader-preview", "/research", "/macro", "/intelligence", "/pricing", "/indicators"] as const;

/** Guest-readable portal paths (Option A — public research & market hubs). */
export function isGuestReadablePortalPath(pathname: string): boolean {
  if (PRIVATE_PORTAL_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return false;
  }
  return GUEST_PORTAL_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export const PUBLIC_SITEMAP_STATIC: { path: string; changeFrequency: ChangeFrequency; priority: number }[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: HUBS.today.route, changeFrequency: "hourly", priority: 0.95 },
  { path: HUBS.markets.route, changeFrequency: "hourly", priority: 0.95 },
  { path: HUBS.economy.route, changeFrequency: "daily", priority: 0.9 },
  { path: HUBS.funds.route, changeFrequency: "daily", priority: 0.85 },
  { path: HUBS.companies.route, changeFrequency: "daily", priority: 0.9 },
  { path: HUBS.trade.route, changeFrequency: "daily", priority: 0.85 },
  { path: HUBS.data.route, changeFrequency: "daily", priority: 0.6 },
  { path: "/intelligence/scanner", changeFrequency: "daily", priority: 0.85 },
  { path: "/intelligence/trade-lab", changeFrequency: "daily", priority: 0.9 },
  { path: "/research/ai-desk", changeFrequency: "daily", priority: 0.95 },
  { path: "/research/options-flow", changeFrequency: "daily", priority: 0.8 },
  { path: "/pricing", changeFrequency: "weekly", priority: 0.75 },
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
    ...LEARN_MODULES.flatMap((m) => [`/learn/${m.slug}`, ...m.chapters.map((c) => `/learn/${m.slug}/${c.slug}`)]),
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
  "/intelligence/scanner",
  "/worldmonitor",
];
