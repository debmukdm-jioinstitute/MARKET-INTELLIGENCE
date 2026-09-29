import { feedFetch } from "@/lib/feeds/http";
import { consensusToReco } from "@/lib/research/normalize";
import type { IpoReviewConsensus, ScrapedReport } from "@/lib/research/types";

const DASHBOARD_URL = "https://www.chittorgarh.com/ipo/ipo_dashboard.asp";
const SITE = "https://www.chittorgarh.com";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (compatible; MarketIntelligenceBot/1.0; +https://getmarketintelligence.in)",
  Accept: "text/html,application/xhtml+xml",
};

function parseIntCell(raw: string): number {
  const n = Number(raw.trim());
  return Number.isFinite(n) ? n : 0;
}

/** SSR table on IPO dashboard — aggregated Apply / Avoid counts per IPO. */
export function parseChittorgarhIpoReviewTable(html: string): ScrapedReport[] {
  const block = html.match(/IPO Reviews[\s\S]*?<table class="table[\s\S]*?<\/table>/i)?.[0] ?? "";
  if (!block) return [];

  const rowRe =
    /<tr>\s*<td class="text">\s*<a[^>]+href="([^"]+)"[^>]*title="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/td>\s*<td class="text-center">(\d+)<\/td>\s*<td class="text-center">(\d+)<\/td>\s*<td class="text-center">(\d+)<\/td>\s*<td class="text-center">(\d+)<\/td>\s*<td class="text-center">(\d+)<\/td>\s*<\/tr>/gi;

  const out: ScrapedReport[] = [];
  for (const m of block.matchAll(rowRe)) {
    const href = m[1]!;
    const title = m[2]!.trim() || m[3]!.replace(/<[^>]+>/g, "").trim();
    const consensus: IpoReviewConsensus = {
      apply: parseIntCell(m[4]!),
      mayApply: parseIntCell(m[5]!),
      neutral: parseIntCell(m[6]!),
      avoid: parseIntCell(m[7]!),
      notRated: parseIntCell(m[8]!),
      netScore: 0,
    };
    consensus.netScore = consensus.apply - consensus.avoid;
    const reco = consensusToReco(consensus);
    const url = href.startsWith("http") ? href : `${SITE}${href}`;
    const summary = `Analyst desk (Chittorgarh): Apply ${consensus.apply} · May apply ${consensus.mayApply} · Neutral ${consensus.neutral} · Avoid ${consensus.avoid} · Not rated ${consensus.notRated}.`;

    out.push({
      broker: "Chittorgarh IPO reviews",
      title: title.replace(/\s+IPO\s*$/i, "").trim() + " — IPO analyst consensus",
      url,
      recommendation: reco,
      reportType: "IPO Analyst Consensus",
      summary,
      publishedAt: new Date().toISOString(),
      extra: { consensus, provider: "Chittorgarh", dashboardUrl: DASHBOARD_URL },
    });
  }
  return out;
}

export async function fetchChittorgarhIpoReviews(): Promise<ScrapedReport[]> {
  const res = await feedFetch(DASHBOARD_URL, { headers: HEADERS, timeoutMs: 18_000 });
  if (!res.ok) return [];
  const html = await res.text();
  return parseChittorgarhIpoReviewTable(html);
}
