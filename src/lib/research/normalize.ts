import type { IpoReviewConsensus, NormalizedReport, RecoLabel, ScrapedReport } from "@/lib/research/types";

const RECO_MAP: Record<string, RecoLabel> = {
  BUY: "BUY",
  "STRONG BUY": "BUY",
  ACCUMULATE: "ACCUMULATE",
  ADD: "ACCUMULATE",
  HOLD: "HOLD",
  NEUTRAL: "HOLD",
  SELL: "SELL",
  REDUCE: "SELL",
};

export function normalizeReco(raw: string | null | undefined): RecoLabel | null {
  if (!raw) return null;
  const key = raw.trim().toUpperCase();
  return RECO_MAP[key] ?? null;
}

/** Best-effort NSE-style symbol from title (before " - ", "|", ":"). */
export function extractSymbolFromTitle(title: string): string | null {
  const paren = title.match(/\(([A-Z0-9&-]{2,20})\)/);
  if (paren?.[1] && /^[A-Z][A-Z0-9&-]+$/.test(paren[1])) return paren[1];

  const prefix = title.match(/^([A-Z0-9&-]{2,15})\s*[:\-|]/);
  if (prefix?.[1] && prefix[1].length >= 2) return prefix[1];

  const words = title.split(/\s[-–|]\s/)[0]?.trim() ?? "";
  if (/^[A-Z][A-Z0-9&-]{1,14}$/.test(words)) return words;

  return null;
}

export function computeUpsidePct(
  target: number | null | undefined,
  cmp: number | null | undefined,
  preset: number | null | undefined,
): number | null {
  if (preset != null && Number.isFinite(preset)) return Math.round(preset * 10) / 10;
  if (target == null || cmp == null || !Number.isFinite(target) || !Number.isFinite(cmp) || cmp <= 0) {
    return null;
  }
  return Math.round(((target - cmp) / cmp) * 1000) / 10;
}

export function consensusToReco(c: IpoReviewConsensus): RecoLabel {
  if (c.apply >= 8 && c.netScore >= 4) return "BUY";
  if (c.netScore >= 2 && c.apply >= c.avoid) return "ACCUMULATE";
  if (c.avoid >= c.apply && c.avoid >= 3) return "SELL";
  return "HOLD";
}

export function normalizeScrapedReport(row: ScrapedReport): NormalizedReport {
  const symbol = row.symbol?.trim().toUpperCase() || extractSymbolFromTitle(row.title);
  const recommendation = normalizeReco(row.recommendation);
  const upsidePct = computeUpsidePct(row.targetPrice, row.cmp, row.upsidePct);
  return {
    ...row,
    symbol,
    recommendation,
    upsidePct,
  };
}

export function normalizeScrapedReports(rows: ScrapedReport[]): NormalizedReport[] {
  return rows.map(normalizeScrapedReport);
}
