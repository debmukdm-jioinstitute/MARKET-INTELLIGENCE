import { nseJson, nseText } from "@/lib/feeds/india/nse-session";
import { LAYOUT_LINES, type Layout, type LineDef } from "./lines";
import { deriveFinancialRatios, deriveWorkingCapital, formatPeriodLabel } from "./ratios";
import type {
  AnnualReportDoc,
  ExecutiveForensicAnalysis,
  FinancialsPayload,
  ForensicFlag,
  StatementColumn,
  StatementRow,
} from "./types";
import { parseResultsXbrl, type Basis, type ParsedPeriod, type ParsedResults } from "./xbrl";
import { summarizeText } from "@/lib/hf/summarizer";

// In-memory cache for parsed financials (15 min TTL)
type CacheEntry = { data: FinancialsPayload; expiresAt: number };
const FINANCIALS_CACHE = new Map<string, CacheEntry>();

type IntegratedRow = {
  attFileSize?: string;
  audited?: string;
  broadcast_Date?: string;
  cmName?: string;
  smName?: string;
  consolidated?: string;
  ixbrl?: string;
  pdf_attach?: string;
  qe_Date?: string;
  symbol?: string;
  xbrl?: string;
};

type CorpResultRow = {
  audited?: string;
  bank?: string;
  broadCastDate?: string;
  companyName?: string;
  consolidated?: string;
  cumulative?: string;
  financialYear?: string;
  fromDate?: string;
  toDate?: string;
  indAs?: string;
  period?: string;
  relatingTo?: string;
  symbol?: string;
  xbrl?: string | null;
};

type AnnualReportRow = {
  companyName?: string;
  fromYr?: string;
  toYr?: string;
  broadcast_dttm?: string;
  fileName?: string;
  attFileSize?: string | null;
  submission_type?: string | null;
};

async function fetchXbrlText(url: string): Promise<string | null> {
  // Session cookie + retry via nseText (L12): the old single-attempt bare
  // fetch silently dropped filings a retry would have delivered.
  return nseText(url, { timeoutMs: 20_000, attempts: 2 });
}

/**
 * Conservative reading of the exchange's audited/unaudited text flag. The old
 * check (contains "audit", not "un") fired on text like "Audited (provisional)".
 * Returns null when the text does not assert a final audit either way.
 */
function looseAudited(raw: string | undefined): boolean | null {
  const t = (raw ?? "").toLowerCase();
  if (!t.includes("audit")) return null;
  if (t.includes("unaudit") || t.includes("un-audit")) return null;
  if (t.includes("provision")) return null; // "Audited (provisional)" is not a final audit
  return true;
}

/**
 * Fetches and aggregates complete financial statements and ratios for any NSE equity.
 */
const MAX_XBRL_FETCHES = 10;
const MAX_ANNUAL_FYS = 5;

const NSE_MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/**
 * Parse NSE broadcast dates ("28-Jul-2026 18:18:07", "31-Jan-2025 01:57:53",
 * "05-May-2026 21:4") to a timestamp. The old code sorted these strings
 * lexicographically, so "31-Jan-2025" ranked NEWER than "28-Jul-2026".
 * Unparseable/empty dates sort as oldest (0).
 */
export function parseNseDate(raw: string | undefined): number {
  const m = raw ? /(\d{1,2})-([A-Za-z]{3})-(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/.exec(raw.trim()) : null;
  if (!m) return 0;
  const mo = NSE_MONTHS[m[2].toLowerCase()] ?? 1;
  return Date.UTC(Number(m[3]), mo - 1, Number(m[1]), Number(m[4] ?? 0), Number(m[5] ?? 0), Number(m[6] ?? 0));
}

/**
 * Budgeted fetch passes (H2 fix). The old blind `slice(0, 10)` on insertion
 * order let the newest quarterly rows crowd out every annual filing, so only
 * the latest FY ever displayed. Now: annual XBRLs for the latest 5 FYs are
 * fetched FIRST (one per FY, consolidated preferred, from the integrated
 * endpoint's 31-Mar year-end rows), then a quarterly pass fills the rest of
 * the 10-file budget. Pure and unit-tested.
 */
export function budgetCandidates<T extends {
  xbrlUrl: string;
  broadcastDate?: string;
  consolidated: boolean;
  source: "integrated" | "quarterly" | "annual";
  isAnnualFiling: boolean;
  fyKey?: string;
}>(candidates: T[]): T[] {
  // Deduplicate by xbrlUrl
  const seenUrls = new Set<string>();
  const deduped = candidates.filter((c) => {
    if (seenUrls.has(c.xbrlUrl)) return false;
    seenUrls.add(c.xbrlUrl);
    return true;
  });

  // Annual pass first: one XBRL per FY, latest MAX_ANNUAL_FYS FYs, consolidated
  // preferred. Annual filings are the integrated-endpoint 31-Mar year-end rows,
  // whose XBRLs carry true full-year periods (verified: LT FY26 + FY25).
  // The legacy annual endpoint is deliberately NOT fetched: its parseable
  // files (FY24/FY23) carry Q4 and full-year numbers in identical,
  // indistinguishable contexts (a "Q4" column would mix Q4 revenue with
  // full-year cash flow), older files don't parse, and pre-FY18 URLs 404.
  const byFy = new Map<string, typeof deduped>();
  for (const c of deduped) {
    if (!c.isAnnualFiling || !c.fyKey) continue;
    const g = byFy.get(c.fyKey) ?? [];
    g.push(c);
    byFy.set(c.fyKey, g);
  }
  const annualPick = [...byFy.keys()]
    .sort((a, b) => Number(b.slice(2)) - Number(a.slice(2)))
    .slice(0, MAX_ANNUAL_FYS)
    .map((fy) => {
      const g = byFy.get(fy)!;
      const consol = g.filter((c) => c.consolidated);
      const pool = consol.length ? consol : g;
      // Prefer actually-broadcast filings (non-empty date), newest first:
      // rows with an empty broadcast date are often un-downloadable re-filings.
      const dated = pool.filter((c) => (c.broadcastDate ?? "").trim() !== "");
      const rest = pool.filter((c) => !dated.includes(c));
      return [...dated, ...rest].sort(
        (a, b) => parseNseDate(b.broadcastDate) - parseNseDate(a.broadcastDate),
      )[0];
    });

  // Quarterly pass: newest broadcast first (chronological, not
  // lexicographic), whatever budget remains. Legacy annual rows are excluded
  // (see above); annual filings already picked stay out of this pass.
  const pickedUrls = new Set(annualPick.map((c) => c.xbrlUrl));
  const quarterlyPick = deduped
    .filter((c) => !pickedUrls.has(c.xbrlUrl) && c.source !== "annual")
    .sort((a, b) => parseNseDate(b.broadcastDate) - parseNseDate(a.broadcastDate))
    .slice(0, Math.max(0, MAX_XBRL_FETCHES - annualPick.length));

  return [...annualPick, ...quarterlyPick];
}

export type ParsedFiling = {
  filing: {
    xbrlUrl: string;
    ixbrlUrl?: string;
    pdfUrl?: string;
    broadcastDate?: string;
    consolidated: boolean;
    audited: boolean | null;
  };
  parsed: ParsedResults;
};

export type PeriodWithMeta = {
  meta: StatementColumn;
  period: ParsedPeriod;
  /** Filing basis that won this period — drives the per-column UI label. */
  basis: Basis | null;
};

/**
 * Organize parsed filings into quarter/annual columns (H1 fix). The old loop
 * was newest-broadcast-wins per period key with the parsed `basis` silently
 * dropped, so a later standalone re-filing overwrote the consolidated numbers
 * for the same FY/quarter and nothing labeled the basis. Now consolidated
 * always wins for a period, newer filings still win within the same basis
 * (restatements), and the winning basis is recorded per column. Pure and
 * unit-tested.
 */
export function mergeParsedPeriods(entries: ParsedFiling[]): {
  quarters: StatementColumn[];
  annuals: StatementColumn[];
  quartersMap: Map<string, PeriodWithMeta>;
  annualsMap: Map<string, PeriodWithMeta>;
} {
  const quartersMap = new Map<string, PeriodWithMeta>();
  const annualsMap = new Map<string, PeriodWithMeta>();

  // Process from oldest to newest so newer filings overwrite earlier
  // un-audited / restated data within the same basis (chronological parse —
  // lexicographic string sort misordered "31-Jan-2025" after "28-Jul-2026").
  const sorted = [...entries].sort(
    (a, b) => parseNseDate(a.filing.broadcastDate) - parseNseDate(b.filing.broadcastDate),
  );

  const insert = (
    map: Map<string, PeriodWithMeta>,
    p: ParsedPeriod,
    kind: "quarter" | "annual",
    filing: ParsedFiling["filing"],
    parsed: ParsedResults,
  ) => {
    const { key, label } = formatPeriodLabel(p.start, p.end, kind);
    const basis: Basis = parsed.basis;
    const existing = map.get(key);
    if (existing) {
      // Consolidated always beats standalone for the same period; within the
      // same basis the newer filing wins (entries are processed oldest first,
      // so restatements overwrite). A standalone filing never displaces a
      // consolidated one.
      const sameBasis = existing.basis === basis;
      const consolidatedBeatsStandalone = basis === "consolidated" && existing.basis === "standalone";
      if (!(sameBasis || consolidatedBeatsStandalone)) return;
    }
    map.set(key, {
      meta: {
        key,
        label,
        startDate: p.start,
        endDate: p.end,
        periodKind: kind,
        audited: parsed.audited ?? filing.audited,
        basis,
        filingDate: filing.broadcastDate,
        xbrlUrl: filing.xbrlUrl,
        ixbrlUrl: filing.ixbrlUrl,
        pdfUrl: filing.pdfUrl,
      },
      period: p,
      basis,
    });
  };

  for (const { filing, parsed } of sorted) {
    for (const p of parsed.periods) {
      // YTD periods are dropped as columns to avoid double-counting P&L;
      // their balance-sheet / cash flow was already attached to the matching
      // quarter by attachYtdStatements in the parser.
      if (p.kind === "quarter") insert(quartersMap, p, "quarter", filing, parsed);
      else if (p.kind === "annual") insert(annualsMap, p, "annual", filing, parsed);
    }
  }

  // Sort columns chronologically
  const quarters = [...quartersMap.values()]
    .sort((a, b) => (a.meta.endDate > b.meta.endDate ? 1 : -1))
    .slice(-8) // last 8 quarters
    .map((q) => q.meta);

  const annuals = [...annualsMap.values()]
    .sort((a, b) => (a.meta.endDate > b.meta.endDate ? 1 : -1))
    .slice(-5) // last 5 years
    .map((a) => a.meta);

  return { quarters, annuals, quartersMap, annualsMap };
}

export async function getCompanyFinancials(symbolInput: string): Promise<FinancialsPayload | null> {
  const symbol = symbolInput.trim().toUpperCase();
  const cached = FINANCIALS_CACHE.get(symbol);
  if (cached && Date.now() < cached.expiresAt) return cached.data;

  // 1. Fetch metadata in parallel
  const [integratedRes, annualReportsRes, corpQuarterlyRes, corpAnnualRes] = await Promise.all([
    nseJson<{ data?: IntegratedRow[] }>(
      `/api/integrated-filing-results?index=equities&period_ended=all&type=Integrated%20Filing-%20Financials&symbol=${encodeURIComponent(symbol)}`,
    ).catch(() => ({ data: [] })),
    nseJson<{ data?: AnnualReportRow[] }>(
      `/api/annual-reports?index=equities&symbol=${encodeURIComponent(symbol)}`,
    ).catch(() => ({ data: [] })),
    nseJson<CorpResultRow[]>(
      `/api/corporates-financial-results?index=equities&symbol=${encodeURIComponent(symbol)}&period=Quarterly`,
    ).catch(() => []),
    nseJson<CorpResultRow[]>(
      `/api/corporates-financial-results?index=equities&symbol=${encodeURIComponent(symbol)}&period=Annual`,
    ).catch(() => []),
  ]);

  // 2. Format annual reports
  const annualReports: AnnualReportDoc[] = (annualReportsRes.data ?? [])
    .filter((r) => r.fileName && !r.fileName.endsWith("/null"))
    .map((r) => ({
      fromYear: r.fromYr ?? "",
      toYear: r.toYr ?? "",
      financialYear: r.fromYr && r.toYr ? `FY${r.toYr.slice(-2)} (${r.fromYr}–${r.toYr})` : "Annual Report",
      companyName: r.companyName ?? symbol,
      broadcastDate: r.broadcast_dttm && r.broadcast_dttm !== "-" ? r.broadcast_dttm : null,
      url: r.fileName!,
      fileSize: r.attFileSize ?? null,
      submissionType: r.submission_type ?? null,
    }));

  // 3. Collect XBRL candidate URLs.
  type FilingCandidate = {
    xbrlUrl: string;
    ixbrlUrl?: string;
    pdfUrl?: string;
    broadcastDate?: string;
    consolidated: boolean;
    audited: boolean | null;
    source: "integrated" | "quarterly" | "annual";
    /** True for integrated-endpoint 31-Mar year-end rows: drives the annual fetch pass. */
    isAnnualFiling: boolean;
    /** "FY2026"-style key for annual filings. */
    fyKey?: string;
  };
  const candidates: FilingCandidate[] = [];

  const pushCandidate = (
    r: { xbrl?: string | null; ixbrl?: string; pdf_attach?: string; broadcast_Date?: string; broadCastDate?: string; qe_Date?: string; consolidated?: string; audited?: string },
    source: FilingCandidate["source"],
  ) => {
    if (!r.xbrl || r.xbrl.endsWith("/null")) return;
    // The legacy corporates endpoint returns archive-relative paths
    // ("corporate/xbrl/....xml"); resolve them against the NSE archives host.
    // Reject junk like the pre-FY18 "-" placeholder that 404s on the archive.
    const raw = r.xbrl.trim();
    if (!/^https?:\/\//i.test(raw) && !/\.xml$/i.test(raw)) return;
    const xbrlUrl = /^https?:\/\//i.test(raw) ? raw : `https://nsearchives.nseindia.com/${raw.replace(/^\/+/, "")}`;
    const isConsol = (r.consolidated ?? "").toLowerCase().includes("consol");
    // Annual-results filings on the integrated endpoint end 31-Mar.
    const qeAnnual = source === "integrated" ? /31-Mar-(\d{4})/i.exec(r.qe_Date ?? "") : null;
    const fyKey = qeAnnual ? `FY${qeAnnual[1]}` : undefined;
    candidates.push({
      xbrlUrl,
      isAnnualFiling: !!qeAnnual,
      fyKey,
      ixbrlUrl: r.ixbrl && !r.ixbrl.endsWith("/null") ? r.ixbrl : undefined,
      pdfUrl: r.pdf_attach && !r.pdf_attach.endsWith("/null") ? r.pdf_attach : undefined,
      broadcastDate: r.broadcast_Date ?? r.broadCastDate,
      consolidated: isConsol,
      audited: looseAudited(r.audited),
      source,
    });
  };

  const ifRows = integratedRes.data ?? [];
  for (const r of ifRows) pushCandidate(r, "integrated");

  // Also supplement from corp quarterly / annual if needed. Legacy annual rows
  // are collected for metadata but never fetched (see budgetCandidates: their
  // parseable files mix Q4 and full-year numbers in identical contexts).
  const corpQuarterly = Array.isArray(corpQuarterlyRes) ? corpQuarterlyRes : [];
  for (const r of corpQuarterly) pushCandidate(r, "quarterly");

  const corpAnnual = Array.isArray(corpAnnualRes) ? corpAnnualRes : [];
  for (const r of corpAnnual) pushCandidate(r, "annual");

  // Fetch with budgeted passes: 5 annual FYs first, then quarterlies (H2).
  const topCandidates = budgetCandidates(candidates);
  const parsedResultsList: { filing: (typeof candidates)[number]; parsed: ParsedResults }[] = [];

  await Promise.all(
    topCandidates.map(async (c) => {
      const xml = await fetchXbrlText(c.xbrlUrl);
      if (!xml) return;
      const parsed = parseResultsXbrl(xml);
      if (parsed) parsedResultsList.push({ filing: c, parsed });
    }),
  );

  if (!parsedResultsList.length && !annualReports.length) {
    return null;
  }

  // Determine primary layout (default general)
  const layout: Layout = parsedResultsList.some((p) => p.parsed.layout === "bank") ? "bank" : "general";
  const lines = LAYOUT_LINES[layout];

  // Organize periods: consolidated wins per period, basis labeled per column (H1).
  const { quarters, annuals, quartersMap, annualsMap } = mergeParsedPeriods(parsedResultsList);


  // Build Statement Rows helper
  function buildRows(lineDefs: LineDef[], cols: StatementColumn[], map: Map<string, PeriodWithMeta>, part: "pl" | "bs" | "cf"): StatementRow[] {
    const rows: StatementRow[] = [];
    for (const d of lineDefs) {
      const values: Record<string, number | null> = {};
      let hasAnyValue = false;
      for (const col of cols) {
        const p = map.get(col.key)?.period;
        const targetObj = part === "pl" ? p?.pl : part === "bs" ? p?.bs : p?.cf;
        const v = targetObj ? targetObj[d.tag] ?? null : null;
        if (v !== null) hasAnyValue = true;
        values[col.key] = v;
      }
      if (hasAnyValue) {
        rows.push({
          tag: d.tag,
          label: d.label,
          kind: d.kind ?? "item",
          unit: d.unit ?? "cr",
          values,
        });
      }
    }
    return rows;
  }

  const plQuarters = buildRows(lines.pl, quarters, quartersMap, "pl");
  const plAnnuals = buildRows(lines.pl, annuals, annualsMap, "pl");
  const bsQuarters = buildRows(lines.bs, quarters, quartersMap, "bs");
  const bsAnnuals = buildRows(lines.bs, annuals, annualsMap, "bs");
  const cfQuarters = buildRows(lines.cf, quarters, quartersMap, "cf");
  const cfAnnuals = buildRows(lines.cf, annuals, annualsMap, "cf");

  // Build working capital & ratios
  const wcQuarters = quarters.map((q) => {
    const p = quartersMap.get(q.key)!.period;
    return deriveWorkingCapital(q.key, q.label, p.pl, p.bs, "quarter");
  });
  const wcAnnuals = annuals.map((a) => {
    const p = annualsMap.get(a.key)!.period;
    return deriveWorkingCapital(a.key, a.label, p.pl, p.bs, "annual");
  });

  const ratiosQuarters = quarters.map((q) => {
    const p = quartersMap.get(q.key)!.period;
    return deriveFinancialRatios(q.key, q.label, p.pl, p.bs, p.cf, "quarter");
  });
  const ratiosAnnuals = annuals.map((a) => {
    const p = annualsMap.get(a.key)!.period;
    return deriveFinancialRatios(a.key, a.label, p.pl, p.bs, p.cf, "annual");
  });

  // Generate Institutional Forensic Analysis
  const latestAnnualRatios = ratiosAnnuals[ratiosAnnuals.length - 1];
  const latestQuarterRatios = ratiosQuarters[ratiosQuarters.length - 1];
  const latestWcAnnual = wcAnnuals[wcAnnuals.length - 1];
  const latestWcQuarter = wcQuarters[wcQuarters.length - 1];

  const flags: ForensicFlag[] = [];
  let score = 75;

  // 1. Debt & Leverage Check
  const d2e = latestAnnualRatios?.debtToEquity ?? latestQuarterRatios?.debtToEquity;
  if (d2e !== null && d2e !== undefined) {
    if (d2e < 0.1) {
      flags.push({
        type: "strength",
        category: "solvency",
        title: "Virtually Debt-Free Balance Sheet",
        detail: `Debt-to-equity is negligible at ${d2e.toFixed(2)}x, insulating the company from borrowing cost pressures and rate hikes.`,
        metricValue: `${d2e.toFixed(2)}x`,
        metricId: "debt",
      });
      score += 10;
    } else if (d2e > 1.5) {
      flags.push({
        type: "warning",
        category: "solvency",
        title: "Elevated Financial Leverage",
        detail: `Debt-to-equity is high at ${d2e.toFixed(2)}x. Debt servicing requires monitoring relative to operating cash flows.`,
        metricValue: `${d2e.toFixed(2)}x`,
        metricId: "debt",
      });
      score -= 15;
    }
  }

  // 2. Working Capital & Cash Conversion Cycle Check
  const ccc = latestWcAnnual?.ccc ?? latestWcQuarter?.ccc;
  const dso = latestWcAnnual?.dso ?? latestWcQuarter?.dso;
  const dio = latestWcAnnual?.dio ?? latestWcQuarter?.dio;
  const dpo = latestWcAnnual?.dpo ?? latestWcQuarter?.dpo;

  let wcSummary = "Working capital metrics are balanced within normative industry ranges.";
  if (ccc !== null && ccc !== undefined) {
    if (ccc <= 30) {
      // M2: a negative CCC means suppliers fund the business — say so, don't call it "locked up".
      const cccDays = Math.round(ccc);
      const cccBits = `(DSO: ${dso ? Math.round(dso) : "—"}d, DIO: ${dio ? Math.round(dio) : "—"}d, DPO: ${dpo ? Math.round(dpo) : "—"}d)`;
      flags.push({
        type: "strength",
        category: "working_capital",
        title: ccc < 0 ? "Suppliers Fund the Business" : "Agile Cash Conversion Cycle",
        detail: ccc < 0
          ? `Cash conversion cycle is ${cccDays} days — suppliers and customers fund the business, so no cash is locked up ${cccBits}.`
          : `Working capital cycle is rapid at ${cccDays} days ${cccBits}, indicating lean capital lock-up.`,
        metricValue: `${cccDays} days`,
        metricId: "cash-cycle",
      });
      score += 10;
      wcSummary = ccc < 0
        ? `Cash conversion cycle is ${cccDays} days: suppliers fund the business, so no cash is locked up.`
        : `Cash conversion cycle is highly efficient at ${cccDays} days. Customer receivables clear in ~${dso ? Math.round(dso) : "—"} days.`;
    } else if (ccc > 120) {
      flags.push({
        type: "warning",
        category: "working_capital",
        title: "Extended Working Capital Cycle",
        detail: `Cash conversion cycle is elevated at ${Math.round(ccc)} days. Substantial liquidity is tied up in working capital.`,
        metricValue: `${Math.round(ccc)} days`,
        metricId: "cash-cycle",
      });
      score -= 10;
      wcSummary = `Cash conversion cycle is extended at ${Math.round(ccc)} days, driven by receivable or inventory holding duration.`;
    }
  }

  // 3. EBITDA Margin (PBDIT-style, Screener.in convention)
  const opm = latestQuarterRatios?.opmPct ?? latestAnnualRatios?.opmPct;
  if (opm !== null && opm !== undefined) {
    if (opm >= 20) {
      flags.push({
        type: "strength",
        category: "profitability",
        title: "High Pricing Power & Margin Resilience",
        detail: `EBITDA margin stands at a robust ${opm.toFixed(1)}%, reflecting strong operational moats and competitive positioning.`,
        metricValue: `${opm.toFixed(1)}%`,
        metricId: "margin",
      });
      score += 10;
    } else if (opm < 5) {
      flags.push({
        type: "warning",
        category: "profitability",
        title: "Thin Operating Margin Buffer",
        detail: `EBITDA margin is compressed at ${opm.toFixed(1)}%, providing minimal cushion against input-cost volatility.`,
        metricValue: `${opm.toFixed(1)}%`,
        metricId: "margin",
      });
      score -= 10;
    }
  }

  // 4. Quality of Earnings: Operating Cash Flow vs Net Profit
  const cfoPat = latestAnnualRatios?.cfoToNetProfit;
  let cashQuality: "High" | "Moderate" | "Weak" = "Moderate";
  if (cfoPat !== null && cfoPat !== undefined) {
    if (cfoPat >= 0.9) {
      cashQuality = "High";
      flags.push({
        type: "strength",
        category: "cash_flow",
        title: "High Earnings Quality (Cash Backed)",
        detail: `Operating cash flow covers ${Math.round(cfoPat * 100)}% of reported net profit, confirming reported earnings are backed by hard cash inflows rather than accounting accruals.`,
        metricValue: `${(cfoPat * 100).toFixed(0)}%`,
        metricId: "cash-backing",
      });
      score += 10;
    } else if (cfoPat < 0.5 && cfoPat >= 0) {
      cashQuality = "Weak";
      flags.push({
        type: "warning",
        category: "cash_flow",
        title: "Divergence Between Cash Flow and Net Profit",
        detail: `Operating cash flow represents only ${Math.round(cfoPat * 100)}% of reported net profit, suggesting slower cash realization or working capital absorption.`,
        metricValue: `${(cfoPat * 100).toFixed(0)}%`,
        metricId: "cash-backing",
      });
      score -= 15;
    }
  }

  const finalScore = Math.max(10, Math.min(98, score));
  const rating =
    finalScore >= 80 ? "Strong" : finalScore >= 60 ? "Adequate" : finalScore >= 40 ? "Cautionary" : "Distressed";

  // Build AI executive summary using BART / FinBERT
  const companyName = ifRows[0]?.cmName ?? annualReports[0]?.companyName ?? symbol;
  const contextForAi = `
Company: ${companyName} (${symbol}).
Financial Health Rating: ${rating} (Score: ${finalScore}/100).
Operating Margin: ${opm !== null && opm !== undefined ? `${opm.toFixed(1)}%` : "N/A"}.
Debt to Equity: ${d2e !== null && d2e !== undefined ? `${d2e.toFixed(2)}x` : "Negligible"}.
Cash Conversion Cycle: ${ccc !== null && ccc !== undefined ? `${Math.round(ccc)} days` : "Normal"}.
Cash Flow Quality: ${cashQuality}.
Key Findings: ${flags.map((f) => `${f.title}: ${f.detail}`).join("; ")}.
  `.trim();

  let executiveSummary = "";
  try {
    const aiSummary = await summarizeText(contextForAi, 65);
    if (aiSummary && aiSummary.length > 30) {
      executiveSummary = aiSummary;
    }
  } catch {
    // fallback
  }

  if (!executiveSummary) {
    executiveSummary = `${companyName} demonstrates an ${rating.toLowerCase()} financial profile with a solvency score of ${finalScore}/100. EBITDA margins stand at ${opm ? `${opm.toFixed(1)}%` : "resilient levels"} with ${d2e !== null && d2e < 0.5 ? "conservative leverage" : "monitored leverage"} and ${cashQuality.toLowerCase()} earnings quality.`;
  }

  // M4: when XBRL yielded nothing, do NOT manufacture a 75/100 "Adequate"
  // verdict. Mark insufficientData so the UI renders an honest state.
  const hasStatements = parsedResultsList.length > 0;
  const forensicAnalysis: ExecutiveForensicAnalysis = {
    healthScore: hasStatements ? finalScore : 0,
    rating: hasStatements ? rating : "Adequate",
    executiveSummary: hasStatements
      ? executiveSummary
      : `${companyName}: not enough filed financial statements are available to run the automated health check. The annual reports below are the official record.`,
    aiModelUsed: "Hugging Face (FinBERT + BART-CNN Institutional Synthesis)",
    flags: hasStatements ? flags : [],
    workingCapitalSummary: hasStatements ? wcSummary : "Insufficient data.",
    cashFlowQuality: hasStatements ? cashQuality : "Moderate",
    insufficientData: !hasStatements,
  };

  const payload: FinancialsPayload = {
    symbol,
    companyName,
    layout,
    asOf: new Date().toISOString(),
    quarters,
    annuals,
    pl: { quarters: plQuarters, annuals: plAnnuals },
    bs: { quarters: bsQuarters, annuals: bsAnnuals },
    cf: { quarters: cfQuarters, annuals: cfAnnuals },
    workingCapital: { quarters: wcQuarters, annuals: wcAnnuals },
    ratios: { quarters: ratiosQuarters, annuals: ratiosAnnuals },
    annualReports,
    forensicAnalysis,
    officialSources: [
      {
        name: "NSE Integrated Financial Filings",
        provider: "National Stock Exchange of India",
        url: `https://www.nseindia.com/companies-listing/corporate-filings-financial-results?symbol=${encodeURIComponent(symbol)}`,
        description: "Official XBRL and PDF financial results under Regulation 33 of SEBI LODR.",
      },
      {
        name: "NSE Annual Reports Archive",
        provider: "National Stock Exchange of India",
        url: `https://www.nseindia.com/companies-listing/corporate-filings-annual-reports?symbol=${encodeURIComponent(symbol)}`,
        description: "Official statutory annual reports submitted to the exchange.",
      },
      {
        name: "NSE Shareholding Pattern Disclosures",
        provider: "National Stock Exchange of India",
        url: `https://www.nseindia.com/companies-listing/corporate-filings-shareholding-pattern?symbol=${encodeURIComponent(symbol)}`,
        description: "Official quarterly shareholding filings under Regulation 31.",
      },
    ],
  };

  FINANCIALS_CACHE.set(symbol, { data: payload, expiresAt: Date.now() + 15 * 60_000 });
  return payload;
}
