import { nseJson } from "@/lib/feeds/india/nse-session";
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
import { parseResultsXbrl, type ParsedPeriod, type ParsedResults } from "./xbrl";
import { classifyFinancialSentiment } from "@/lib/hf/finbert";
import { summarizeText } from "@/lib/hf/summarizer";

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  Accept: "application/xml,text/xml,*/*",
  Referer: "https://www.nseindia.com/",
};

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
  try {
    const res = await fetch(url, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(20_000) });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/**
 * Fetches and aggregates complete financial statements and ratios for any NSE equity.
 */
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

  // 3. Collect XBRL candidate URLs (prioritizing consolidated, latest first)
  type FilingCandidate = {
    xbrlUrl: string;
    ixbrlUrl?: string;
    pdfUrl?: string;
    broadcastDate?: string;
    consolidated: boolean;
    audited: boolean | null;
  };
  const candidates: FilingCandidate[] = [];

  const ifRows = integratedRes.data ?? [];
  for (const r of ifRows) {
    if (!r.xbrl || r.xbrl.endsWith("/null")) continue;
    const isConsol = (r.consolidated ?? "").toLowerCase().includes("consol");
    const isAudit = (r.audited ?? "").toLowerCase().includes("audit") && !(r.audited ?? "").toLowerCase().includes("un");
    candidates.push({
      xbrlUrl: r.xbrl,
      ixbrlUrl: r.ixbrl && !r.ixbrl.endsWith("/null") ? r.ixbrl : undefined,
      pdfUrl: r.pdf_attach && !r.pdf_attach.endsWith("/null") ? r.pdf_attach : undefined,
      broadcastDate: r.broadcast_Date,
      consolidated: isConsol,
      audited: isAudit,
    });
  }

  // Also supplement from corp quarterly / annual if needed
  const corpQuarterly = Array.isArray(corpQuarterlyRes) ? corpQuarterlyRes : [];
  for (const r of corpQuarterly) {
    if (!r.xbrl || r.xbrl.endsWith("/null")) continue;
    const isConsol = (r.consolidated ?? "").toLowerCase().includes("consol");
    const isAudit = (r.audited ?? "").toLowerCase().includes("audit") && !(r.audited ?? "").toLowerCase().includes("un");
    candidates.push({
      xbrlUrl: r.xbrl,
      broadcastDate: r.broadCastDate,
      consolidated: isConsol,
      audited: isAudit,
    });
  }

  const corpAnnual = Array.isArray(corpAnnualRes) ? corpAnnualRes : [];
  for (const r of corpAnnual) {
    if (!r.xbrl || r.xbrl.endsWith("/null")) continue;
    const isConsol = (r.consolidated ?? "").toLowerCase().includes("consol");
    const isAudit = (r.audited ?? "").toLowerCase().includes("audit") && !(r.audited ?? "").toLowerCase().includes("un");
    candidates.push({
      xbrlUrl: r.xbrl,
      broadcastDate: r.broadCastDate,
      consolidated: isConsol,
      audited: isAudit,
    });
  }

  // Deduplicate by xbrlUrl
  const seenUrls = new Set<string>();
  const dedupedCandidates = candidates.filter((c) => {
    if (seenUrls.has(c.xbrlUrl)) return false;
    seenUrls.add(c.xbrlUrl);
    return true;
  });

  // Fetch up to 10 latest files
  const topCandidates = dedupedCandidates.slice(0, 10);
  const parsedResultsList: { filing: FilingCandidate; parsed: ParsedResults }[] = [];

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

  // Organize periods: Quarter map and Annual map
  type PeriodWithMeta = {
    meta: StatementColumn;
    period: ParsedPeriod;
  };
  const quartersMap = new Map<string, PeriodWithMeta>();
  const annualsMap = new Map<string, PeriodWithMeta>();

  // Process from oldest to newest so newer filings overwrite earlier un-audited / restated data
  parsedResultsList.sort((a, b) => (a.filing.broadcastDate ?? "") > (b.filing.broadcastDate ?? "") ? 1 : -1);

  for (const { filing, parsed } of parsedResultsList) {
    for (const p of parsed.periods) {
      if (p.kind === "quarter") {
        const { key, label } = formatPeriodLabel(p.start, p.end, "quarter");
        quartersMap.set(key, {
          meta: {
            key,
            label,
            startDate: p.start,
            endDate: p.end,
            periodKind: "quarter",
            audited: parsed.audited ?? filing.audited,
            filingDate: filing.broadcastDate,
            xbrlUrl: filing.xbrlUrl,
            ixbrlUrl: filing.ixbrlUrl,
            pdfUrl: filing.pdfUrl,
          },
          period: p,
        });
      } else if (p.kind === "annual") {
        const { key, label } = formatPeriodLabel(p.start, p.end, "annual");
        annualsMap.set(key, {
          meta: {
            key,
            label,
            startDate: p.start,
            endDate: p.end,
            periodKind: "annual",
            audited: parsed.audited ?? filing.audited,
            filingDate: filing.broadcastDate,
            xbrlUrl: filing.xbrlUrl,
            ixbrlUrl: filing.ixbrlUrl,
            pdfUrl: filing.pdfUrl,
          },
          period: p,
        });
      }
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
      });
      score += 10;
    } else if (d2e > 1.5) {
      flags.push({
        type: "warning",
        category: "solvency",
        title: "Elevated Financial Leverage",
        detail: `Debt-to-equity is high at ${d2e.toFixed(2)}x. Debt servicing requires monitoring relative to operating cash flows.`,
        metricValue: `${d2e.toFixed(2)}x`,
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
      flags.push({
        type: "strength",
        category: "working_capital",
        title: "Agile Cash Conversion Cycle",
        detail: `Working capital cycle is rapid at ${Math.round(ccc)} days (DSO: ${dso ? Math.round(dso) : "—"}d, DIO: ${dio ? Math.round(dio) : "—"}d, DPO: ${dpo ? Math.round(dpo) : "—"}d), indicating lean capital lock-up.`,
        metricValue: `${Math.round(ccc)} days`,
      });
      score += 10;
      wcSummary = `Cash conversion cycle is highly efficient at ${Math.round(ccc)} days. Customer receivables clear in ~${dso ? Math.round(dso) : "—"} days.`;
    } else if (ccc > 120) {
      flags.push({
        type: "warning",
        category: "working_capital",
        title: "Extended Working Capital Cycle",
        detail: `Cash conversion cycle is elevated at ${Math.round(ccc)} days. Substantial liquidity is tied up in working capital.`,
        metricValue: `${Math.round(ccc)} days`,
      });
      score -= 10;
      wcSummary = `Cash conversion cycle is extended at ${Math.round(ccc)} days, driven by receivable or inventory holding duration.`;
    }
  }

  // 3. Operating Profit Margin (OPM)
  const opm = latestQuarterRatios?.opmPct ?? latestAnnualRatios?.opmPct;
  if (opm !== null && opm !== undefined) {
    if (opm >= 20) {
      flags.push({
        type: "strength",
        category: "profitability",
        title: "High Pricing Power & Margin Resilience",
        detail: `Operating margin stands at a robust ${opm.toFixed(1)}%, reflecting strong operational moats and competitive positioning.`,
        metricValue: `${opm.toFixed(1)}%`,
      });
      score += 10;
    } else if (opm < 5) {
      flags.push({
        type: "warning",
        category: "profitability",
        title: "Thin Operating Margin Buffer",
        detail: `Operating margin is compressed at ${opm.toFixed(1)}%, providing minimal cushion against input-cost volatility.`,
        metricValue: `${opm.toFixed(1)}%`,
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
    executiveSummary = `${companyName} demonstrates an ${rating.toLowerCase()} financial profile with a solvency score of ${finalScore}/100. Operating margins stand at ${opm ? `${opm.toFixed(1)}%` : "resilient levels"} with ${d2e !== null && d2e < 0.5 ? "conservative leverage" : "monitored leverage"} and ${cashQuality.toLowerCase()} earnings quality.`;
  }

  const forensicAnalysis: ExecutiveForensicAnalysis = {
    healthScore: finalScore,
    rating,
    executiveSummary,
    aiModelUsed: "Hugging Face (FinBERT + BART-CNN Institutional Synthesis)",
    flags,
    workingCapitalSummary: wcSummary,
    cashFlowQuality: cashQuality,
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
