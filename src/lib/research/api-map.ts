import { normalizeScrapedReport } from "@/lib/research/normalize";
import type { IpoReviewConsensus } from "@/lib/research/types";

export type ApiResearchReport = {
  id: string;
  source: string;
  broker: string | null;
  title: string;
  url: string;
  pdf_url: string | null;
  symbol: string | null;
  recommendation: string | null;
  target_price: number | null;
  cmp: number | null;
  upside_pct: number | null;
  report_type: string | null;
  summary: string | null;
  published_at: string | null;
  scraped_at: string;
  extra: Record<string, unknown> | null;
  consensus: IpoReviewConsensus | null;
};

function parseExtra(raw: unknown): Record<string, unknown> | null {
  if (!raw) return null;
  if (typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return null;
}

export function mapResearchRow(row: Record<string, unknown>): ApiResearchReport {
  const extra = parseExtra(row.extra);
  const consensusRaw = extra?.consensus;
  const consensus =
    consensusRaw &&
    typeof consensusRaw === "object" &&
    "apply" in (consensusRaw as object)
      ? (consensusRaw as IpoReviewConsensus)
      : null;

  return {
    id: String(row.id ?? row.url),
    source: String(row.source ?? ""),
    broker: (row.broker as string | null) ?? null,
    title: String(row.title ?? ""),
    url: String(row.url ?? ""),
    pdf_url: (row.pdf_url as string | null) ?? null,
    symbol: (row.symbol as string | null) ?? null,
    recommendation: (row.recommendation as string | null) ?? null,
    target_price: row.target_price != null ? Number(row.target_price) : null,
    cmp: row.cmp != null ? Number(row.cmp) : null,
    upside_pct: row.upside_pct != null ? Number(row.upside_pct) : null,
    report_type: (row.report_type as string | null) ?? null,
    summary: (row.summary as string | null) ?? null,
    published_at: row.published_at ? new Date(row.published_at as string).toISOString() : null,
    scraped_at: row.scraped_at ? new Date(row.scraped_at as string).toISOString() : new Date().toISOString(),
    extra,
    consensus,
  };
}

export function mapScrapedToApiReports(
  items: Parameters<typeof normalizeScrapedReport>[0][],
  sourceKey: string,
): ApiResearchReport[] {
  return items.map((raw, i) => {
    const n = normalizeScrapedReport(raw);
    const extra = n.extra ?? null;
    const consensus =
      extra?.consensus && typeof extra.consensus === "object"
        ? (extra.consensus as IpoReviewConsensus)
        : null;
    return {
      id: `${sourceKey}-${i}-${n.url}`,
      source: sourceKey,
      broker: n.broker,
      title: n.title,
      url: n.url,
      pdf_url: n.pdfUrl ?? null,
      symbol: n.symbol,
      recommendation: n.recommendation,
      target_price: n.targetPrice ?? null,
      cmp: n.cmp ?? null,
      upside_pct: n.upsidePct,
      report_type: n.reportType ?? null,
      summary: n.summary,
      published_at: n.publishedAt,
      scraped_at: new Date().toISOString(),
      extra,
      consensus,
    };
  });
}
