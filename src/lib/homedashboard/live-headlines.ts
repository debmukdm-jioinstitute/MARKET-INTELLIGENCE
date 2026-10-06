import { fetchLiveMarketHeadlines, type LiveMarketHeadline } from "@/lib/brief/live-market-headlines";
import { annotate, type HomeHeadline } from "@/lib/homedashboard/brief";
import { headlineSeverityScore } from "@/lib/homedashboard/headline-severity";

function timeAgoFrom(iso?: string): string {
  if (!iso) return "Recently";
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 0) return "Recently";
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${Math.max(1, mins)} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function toHomeHeadline(n: LiveMarketHeadline): HomeHeadline {
  const meta = annotate(n.title);
  return {
    title: n.title,
    source: n.source,
    href: n.link,
    time: n.publishedAt ? timeAgoFrom(n.publishedAt) : "Recently",
    publishedAt: n.publishedAt,
    sector: meta.sector,
    symbols: meta.symbols,
    why: meta.why,
    severity: headlineSeverityScore(n.title),
  };
}

function sortForHome(items: HomeHeadline[]): HomeHeadline[] {
  return [...items].sort((a, b) => {
    const sd = (b.severity ?? 0) - (a.severity ?? 0);
    if (sd !== 0) return sd;
    const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return tb - ta;
  });
}

/** Live headlines for Home — severity-ranked, diverse sources, at least `min` when feeds allow. */
export async function buildHomeMarketHeadlines(min = 5, max = 8): Promise<HomeHeadline[]> {
  const raw = await fetchLiveMarketHeadlines(Math.max(14, max + 6));
  const mapped = sortForHome(raw.map(toHomeHeadline));
  const unique = [...new Map(mapped.map((h) => [h.title.toLowerCase(), h])).values()];
  if (unique.length >= min) return unique.slice(0, max);
  return unique;
}
