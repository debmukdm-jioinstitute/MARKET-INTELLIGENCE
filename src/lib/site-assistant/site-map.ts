import { METRIC_COMMANDS, PAGE_COMMANDS, type PageCommand } from "@/lib/command-registry";
import { NAV_SECTIONS } from "@/lib/nav-columns";

export type PageSearchResult = Pick<PageCommand, "href" | "label" | "description">;

/** Matches portal paths in assistant prose, including ?view= / ?tab= query strings. */
export const PORTAL_PATH_IN_TEXT =
  /(\/[a-zA-Z0-9/_-]+(?:\?[a-zA-Z0-9_=&%-]+)?)/g;

const STATIC_HREFS = new Set(PAGE_COMMANDS.map((p) => p.href.toLowerCase()));

const NAV_HREFS = new Set<string>();
for (const section of NAV_SECTIONS) {
  for (const group of section.groups) {
    for (const item of group.items) {
      if (item.external) continue;
      NAV_HREFS.add(item.href.toLowerCase());
      const pathOnly = item.href.split("?")[0]!.split("#")[0]!;
      NAV_HREFS.add(pathOnly.toLowerCase());
    }
  }
}

const SAFE_SEARCH = /^\?[a-zA-Z0-9_=&%-]*$/;

export function splitPortalHref(href: string): { path: string; search: string } {
  const trimmed = href.trim();
  const noHash = trimmed.split("#")[0]!;
  const q = noHash.indexOf("?");
  if (q === -1) return { path: noHash, search: "" };
  return { path: noHash.slice(0, q), search: noHash.slice(q) };
}

function pathMatchesRegistry(pathLower: string): boolean {
  if (STATIC_HREFS.has(pathLower)) return true;
  if (NAV_HREFS.has(pathLower)) return true;
  for (const allowed of STATIC_HREFS) {
    const base = allowed.split("?")[0]!;
    if (pathLower === base || (base.length > 1 && pathLower.startsWith(`${base}/`))) return true;
  }
  for (const allowed of NAV_HREFS) {
    const base = allowed.split("?")[0]!;
    if (pathLower === base || (base.length > 1 && pathLower.startsWith(`${base}/`))) return true;
  }
  return false;
}

/** Allowlist for client-side navigation tool validation. */
export function isAllowedHref(href: string): boolean {
  const normalized = href.trim();
  if (!normalized.startsWith("/") || normalized.includes("://")) return false;

  const { path, search } = splitPortalHref(normalized);
  if (search && !SAFE_SEARCH.test(search)) return false;

  const fullLower = normalized.toLowerCase();
  if (STATIC_HREFS.has(fullLower) || NAV_HREFS.has(fullLower)) return true;

  const pathLower = path.toLowerCase();
  if (pathMatchesRegistry(pathLower)) return true;

  if (/^\/research\/[A-Za-z0-9.&-]+$/i.test(path)) return true;
  if (/^\/research\/model\/[A-Za-z0-9.&-]+$/i.test(path)) return true;

  return false;
}

const NAV_SEARCH_PAGES: PageCommand[] = NAV_SECTIONS.flatMap((section) =>
  section.groups.flatMap((group) =>
    group.items
      .filter((item) => !item.external)
      .map((item) => ({
        href: item.href,
        label: item.label,
        description: item.desc ?? group.desc,
      })),
  ),
);

const SEARCH_CATALOG: PageCommand[] = (() => {
  const seen = new Set<string>();
  const out: PageCommand[] = [];
  for (const p of [...PAGE_COMMANDS, ...NAV_SEARCH_PAGES]) {
    const key = p.href.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
})();

function scorePage(page: PageCommand, query: string): number {
  const q = query.toLowerCase();
  const hay = `${page.label} ${page.description} ${page.href}`.toLowerCase();
  if (page.label.toLowerCase() === q) return 100;
  if (page.href.toLowerCase() === q) return 95;
  if (page.label.toLowerCase().includes(q)) return 80;
  if (hay.includes(q)) return 50;
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 0;
  const hits = tokens.filter((t) => hay.includes(t)).length;
  return hits > 0 ? 20 + hits * 10 : 0;
}

export function searchPages(query: string, limit = 8): PageSearchResult[] {
  const q = query.trim();
  if (!q) return SEARCH_CATALOG.slice(0, limit).map(({ href, label, description }) => ({ href, label, description }));
  return SEARCH_CATALOG.map((page) => ({ page, score: scorePage(page, q) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ page }) => ({ href: page.href, label: page.label, description: page.description }));
}

export function relatedPagesForPath(pathname: string, limit = 5): PageSearchResult[] {
  const path = pathname.toLowerCase().split("?")[0]!;
  const segment = path.split("/").filter(Boolean)[0] ?? "";
  const scored = SEARCH_CATALOG.map((page) => {
    const p = page.href.toLowerCase().split("?")[0]!;
    let score = 0;
    if (p === path) score += 100;
    if (path.startsWith(p) && p.length > 1) score += 60;
    if (segment && p.includes(`/${segment}`)) score += 30;
    if (page.label.toLowerCase().includes(segment)) score += 15;
    return { page, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ page }) => ({ href: page.href, label: page.label, description: page.description }));

  if (scored.length >= limit) return scored;

  const metricHits = METRIC_COMMANDS.filter((m) => m.href.toLowerCase() === path || m.href.toLowerCase().startsWith(path))
    .slice(0, 2)
    .flatMap((m) => {
      const page = SEARCH_CATALOG.find((p) => p.href.split("?")[0]!.toLowerCase() === m.href.toLowerCase());
      return page ? [{ href: page.href, label: page.label, description: page.description }] : [];
    });

  const seen = new Set(scored.map((s) => s.href));
  for (const m of metricHits) {
    if (!seen.has(m.href)) scored.push(m);
  }
  return scored.slice(0, limit);
}

export function compactSiteMapLines(): string[] {
  return SEARCH_CATALOG.map((p) => `${p.href} — ${p.label}: ${p.description}`);
}
