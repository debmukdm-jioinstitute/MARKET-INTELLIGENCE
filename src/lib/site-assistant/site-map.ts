import { METRIC_COMMANDS, PAGE_COMMANDS, type PageCommand } from "@/lib/command-registry";

export type PageSearchResult = Pick<PageCommand, "href" | "label" | "description">;

const STATIC_HREFS = new Set(PAGE_COMMANDS.map((p) => p.href.toLowerCase()));

/** Allowlist for client-side navigation tool validation. */
export function isAllowedHref(href: string): boolean {
  const normalized = href.trim();
  if (!normalized.startsWith("/") || normalized.includes("://")) return false;
  if (STATIC_HREFS.has(normalized.toLowerCase())) return true;
  // Dynamic research paths
  if (/^\/research\/[A-Za-z0-9.&-]+$/i.test(normalized)) return true;
  if (/^\/research\/model\/[A-Za-z0-9.&-]+$/i.test(normalized)) return true;
  return false;
}

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
  if (!q) return PAGE_COMMANDS.slice(0, limit).map(({ href, label, description }) => ({ href, label, description }));
  return PAGE_COMMANDS.map((page) => ({ page, score: scorePage(page, q) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ page }) => ({ href: page.href, label: page.label, description: page.description }));
}

export function relatedPagesForPath(pathname: string, limit = 5): PageSearchResult[] {
  const path = pathname.toLowerCase();
  const segment = path.split("/").filter(Boolean)[0] ?? "";
  const scored = PAGE_COMMANDS.map((page) => {
    const p = page.href.toLowerCase();
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
      const page = PAGE_COMMANDS.find((p) => p.href === m.href);
      return page ? [{ href: page.href, label: page.label, description: page.description }] : [];
    });

  const seen = new Set(scored.map((s) => s.href));
  for (const m of metricHits) {
    if (!seen.has(m.href)) scored.push(m);
  }
  return scored.slice(0, limit);
}

export function compactSiteMapLines(): string[] {
  return PAGE_COMMANDS.map((p) => `${p.href} — ${p.label}: ${p.description}`);
}
