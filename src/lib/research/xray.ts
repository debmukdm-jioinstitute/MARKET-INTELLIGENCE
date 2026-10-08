/**
 * Financial X-Ray engine — deterministic analytics over normalized annual
 * financial periods for /research/[symbol] Phase 1 (FEATURE 1, spec 1A-1G).
 *
 * Pure arithmetic: growth CAGRs, profitability, balance-sheet health, cash
 * quality, operating efficiency, and compact annual trends. Every displayed
 * metric is a Metric with provenance; missing data is reported as
 * unavailable / not-applicable / insufficient-history — never invented.
 *
 * Conventions mirror the shared stubs (src/lib/research/analytics-types.ts,
 * src/lib/research/analytics-math.ts): cagr/yoy return fractions, margins,
 * roe and roce return PERCENT (x100).
 */
import {
  type CompanyType,
  type Metric,
  type MetricSource,
  type MetricUnit,
  type NormalizedPeriod,
  insufficientHistory,
  metric,
  notApplicable,
  unavailable,
} from "./analytics-types";
import {
  avgCapitalEmployed,
  avgEquity,
  cagr,
  ccc,
  cfoToPat,
  debtToEquity,
  dio,
  dpo,
  dso,
  ebitMargin,
  ebitdaMargin,
  fcf,
  fcfMargin,
  grossMargin,
  interestCoverage,
  mean,
  netDebt,
  netDebtToEbitda,
  normalizeCapex,
  patMargin,
  roe,
  roce,
  safeDiv,
  yoy,
} from "./analytics-math";

export type XRayRow = {
  id: string;
  label: string;
  unit: MetricUnit;
  latest: Metric;
  byPeriod: Record<string, Metric>;
};

export type XRayTrend = {
  id: string;
  label: string;
  unit: MetricUnit;
  points: { periodKey: string; value: number | null }[];
};

export type FinancialXRay = {
  periods: { key: string; label: string }[];
  growth: XRayRow[];
  profitability: XRayRow[];
  health: XRayRow[];
  cashQuality: XRayRow[];
  efficiency: XRayRow[];
  trends: XRayTrend[];
  asOf: string;
  source: MetricSource;
};

const finite = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

/** Finite value -> ok metric, otherwise unavailable with a short reason. */
const asMetric = (
  value: number | null | undefined,
  unit: MetricUnit,
  src: MetricSource,
  note: string | null = null,
): Metric =>
  finite(value)
    ? metric(value, unit, src, note)
    : unavailable(src, note ?? "Not available");

/** Per-annual byPeriod series for a row, newest last like the input. */
function byPeriod(
  periods: NormalizedPeriod[],
  src: MetricSource,
  unit: MetricUnit,
  compute: (p: NormalizedPeriod) => number | null | undefined,
): Record<string, Metric> {
  const out: Record<string, Metric> = {};
  for (const p of periods) {
    out[p.key] = asMetric(compute(p), unit, src);
  }
  return out;
}

const naRow = (
  id: string,
  label: string,
  unit: MetricUnit,
  src: MetricSource,
  note: string,
): XRayRow => ({
  id,
  label,
  unit,
  latest: notApplicable(src, note),
  byPeriod: {},
});

/* ------------------------------------------------------------------ */
/* Growth (1A)                                                         */
/* ------------------------------------------------------------------ */

type CagrWindow = { years: 3 | 5 | 10; need: number };
/** Preferred window order: 5Y, then 3Y, then 10Y (needs >=6 / >=4 / >=11 finite values). */
const CAGR_WINDOWS: CagrWindow[] = [
  { years: 5, need: 6 },
  { years: 3, need: 4 },
  { years: 10, need: 11 },
];

/**
 * CAGR over the longest computable standard window. The window must be a
 * contiguous trailing run of finite values; a non-positive base value is
 * reported as not meaningful (per spec 1A safety), never annualized.
 */
function growthLatest(values: Array<number | null>, src: MetricSource): Metric {
  const finiteCount = values.filter(finite).length;
  for (const { years, need } of CAGR_WINDOWS) {
    if (finiteCount < need) continue;
    const slice = values.slice(-(years + 1));
    if (slice.length < years + 1 || !slice.every(finite)) continue;
    const base = slice[0];
    if (base === undefined || base <= 0) {
      return insufficientHistory(
        src,
        "Not meaningful: non-positive base value",
      );
    }
    const r = cagr(slice);
    if (r === null) {
      return insufficientHistory(
        src,
        "Not meaningful: non-positive base value",
      );
    }
    return metric(
      r * 100,
      "pct",
      src,
      `Compound annual growth over the last ${years} reported years`,
    );
  }
  return insufficientHistory(src, "Insufficient history");
}

/** Per-period YoY growth (x100) for context alongside the CAGR. */
function growthByPeriod(
  periods: NormalizedPeriod[],
  src: MetricSource,
  get: (p: NormalizedPeriod) => number | null,
): Record<string, Metric> {
  const out: Record<string, Metric> = {};
  periods.forEach((p, i) => {
    if (i === 0) {
      out[p.key] = unavailable(src, "No prior reported period");
      return;
    }
    const prev = periods[i - 1];
    const g = prev === undefined ? null : yoy(get(p), get(prev));
    out[p.key] =
      g === null
        ? unavailable(src, "Not available")
        : metric(g * 100, "pct", src);
  });
  return out;
}

const GROWTH_DEFS: Array<{
  id: string;
  label: string;
  get: (p: NormalizedPeriod) => number | null;
}> = [
  { id: "revenue-cagr", label: "Revenue CAGR", get: (p) => p.revenue },
  { id: "ebitda-cagr", label: "EBITDA CAGR", get: (p) => p.ebitda },
  { id: "pat-cagr", label: "PAT CAGR", get: (p) => p.pat },
  { id: "eps-cagr", label: "EPS CAGR", get: (p) => p.eps },
  { id: "cfo-cagr", label: "CFO CAGR", get: (p) => p.cfo },
];

/* ------------------------------------------------------------------ */
/* Shared per-period derived values                                    */
/* ------------------------------------------------------------------ */

/** FCF for a period: CFO minus normalized capex outflow; provider-reported fallback. */
function fcfOf(p: NormalizedPeriod): { value: number | null; providerReported: boolean } {
  const computed = fcf(p.cfo, normalizeCapex(p.capex));
  if (computed !== null) return { value: computed, providerReported: false };
  if (finite(p.freeCashFlow)) {
    return { value: p.freeCashFlow, providerReported: true };
  }
  return { value: null, providerReported: false };
}

/** Capex / revenue as PERCENT, mirroring the margin helpers (null unless revenue > 0). */
const capexRevenuePct = (
  capexVal: number | null | undefined,
  revenue: number | null | undefined,
): number | null => {
  const r = safeDiv(normalizeCapex(capexVal), revenue);
  return r === null || !finite(revenue) || revenue <= 0 ? null : r * 100;
};

/* ------------------------------------------------------------------ */
/* buildXRay                                                           */
/* ------------------------------------------------------------------ */

export function buildXRay(
  periods: NormalizedPeriod[],
  companyType: CompanyType,
): FinancialXRay {
  const src: MetricSource = {
    provider: "NSE",
    sourceType: "derived",
    inputs: ["company_filing"],
    retrievedAt: new Date().toISOString(),
  };
  // "unknown" is treated as industrial; only "bank-nbfc" suppresses rows.
  const isBank = companyType === "bank-nbfc";
  const latest: NormalizedPeriod | null =
    periods.length > 0 ? periods[periods.length - 1] : null;

  const avgEq = avgEquity(periods);
  const avgCE = avgCapitalEmployed(periods);
  const avgTA = mean(periods.map((p) => p.totalAssets));

  /* Growth ---------------------------------------------------------- */
  const growth: XRayRow[] = GROWTH_DEFS.map(({ id, label, get }) => ({
    id,
    label,
    unit: "pct" as MetricUnit,
    latest: growthLatest(periods.map(get), src),
    byPeriod: growthByPeriod(periods, src, get),
  }));

  /* Profitability (1B) ----------------------------------------------- */
  const profitability: XRayRow[] = [
    {
      id: "gross-margin",
      label: "Gross Margin",
      unit: "pct",
      latest: asMetric(
        latest ? grossMargin(latest.grossProfit, latest.revenue) : null,
        "pct",
        src,
      ),
      byPeriod: byPeriod(periods, src, "pct", (p) =>
        grossMargin(p.grossProfit, p.revenue),
      ),
    },
    {
      id: "ebitda-margin",
      label: "EBITDA Margin",
      unit: "pct",
      latest: asMetric(
        latest ? ebitdaMargin(latest.ebitda, latest.revenue) : null,
        "pct",
        src,
      ),
      byPeriod: byPeriod(periods, src, "pct", (p) =>
        ebitdaMargin(p.ebitda, p.revenue),
      ),
    },
    {
      id: "ebit-margin",
      label: "EBIT Margin",
      unit: "pct",
      latest: asMetric(
        latest ? ebitMargin(latest.ebit, latest.revenue) : null,
        "pct",
        src,
      ),
      byPeriod: byPeriod(periods, src, "pct", (p) =>
        ebitMargin(p.ebit, p.revenue),
      ),
    },
    {
      id: "pat-margin",
      label: "PAT Margin",
      unit: "pct",
      latest: asMetric(
        latest ? patMargin(latest.pat, latest.revenue) : null,
        "pct",
        src,
      ),
      byPeriod: byPeriod(periods, src, "pct", (p) =>
        patMargin(p.pat, p.revenue),
      ),
    },
    {
      id: "roe",
      label: "ROE",
      unit: "pct",
      latest: asMetric(
        latest ? roe(latest.pat, avgEq) : null,
        "pct",
        src,
        "Average equity over available reported periods",
      ),
      byPeriod: byPeriod(periods, src, "pct", (p) => roe(p.pat, avgEq)),
    },
    {
      id: "roce",
      label: "ROCE",
      unit: "pct",
      latest: asMetric(
        latest ? roce(latest.ebit, avgCE) : null,
        "pct",
        src,
        "Average capital employed (equity + debt) over available reported periods",
      ),
      byPeriod: byPeriod(periods, src, "pct", (p) => roce(p.ebit, avgCE)),
    },
  ];

  /* Balance-sheet health (1C) ----------------------------------------- */
  const netDebtLatest = latest ? netDebt(latest.totalDebt, latest.cash) : null;
  const health: XRayRow[] = [
    {
      id: "net-debt",
      label: "Net Debt",
      unit: "inr-cr",
      latest: asMetric(netDebtLatest, "inr-cr", src),
      byPeriod: byPeriod(periods, src, "inr-cr", (p) =>
        netDebt(p.totalDebt, p.cash),
      ),
    },
    isBank
      ? naRow(
          "net-debt-ebitda",
          "Net Debt / EBITDA",
          "multiple",
          src,
          "Not applicable to banks/NBFCs",
        )
      : {
          id: "net-debt-ebitda",
          label: "Net Debt / EBITDA",
          unit: "multiple" as MetricUnit,
          latest: asMetric(
            netDebtToEbitda(netDebtLatest, latest?.ebitda),
            "multiple",
            src,
          ),
          byPeriod: byPeriod(periods, src, "multiple", (p) =>
            netDebtToEbitda(netDebt(p.totalDebt, p.cash), p.ebitda),
          ),
        },
    isBank
      ? naRow(
          "debt-equity",
          "Debt / Equity",
          "ratio",
          src,
          "Not applicable to banks/NBFCs",
        )
      : {
          id: "debt-equity",
          label: "Debt / Equity",
          unit: "ratio" as MetricUnit,
          latest: asMetric(
            latest ? debtToEquity(latest.totalDebt, latest.totalEquity) : null,
            "ratio",
            src,
          ),
          byPeriod: byPeriod(periods, src, "ratio", (p) =>
            debtToEquity(p.totalDebt, p.totalEquity),
          ),
        },
    {
      id: "interest-coverage",
      label: "Interest Coverage",
      unit: "multiple",
      latest: asMetric(
        latest ? interestCoverage(latest.ebit, latest.interestExpense) : null,
        "multiple",
        src,
      ),
      byPeriod: byPeriod(periods, src, "multiple", (p) =>
        interestCoverage(p.ebit, p.interestExpense),
      ),
    },
    {
      id: "current-ratio",
      label: "Current Ratio",
      unit: "ratio",
      latest: asMetric(
        latest ? safeDiv(latest.currentAssets, latest.currentLiabilities) : null,
        "ratio",
        src,
      ),
      byPeriod: byPeriod(periods, src, "ratio", (p) =>
        safeDiv(p.currentAssets, p.currentLiabilities),
      ),
    },
  ];

  /* Cash quality (1D) -------------------------------------------------- */
  const fcfLatest = latest ? fcfOf(latest) : { value: null, providerReported: false };
  const cashQuality: XRayRow[] = [
    {
      id: "cfo-pat",
      label: "CFO / PAT",
      unit: "multiple",
      latest: asMetric(
        latest ? cfoToPat(latest.cfo, latest.pat) : null,
        "multiple",
        src,
      ),
      byPeriod: byPeriod(periods, src, "multiple", (p) =>
        cfoToPat(p.cfo, p.pat),
      ),
    },
    {
      id: "fcf",
      label: "Free Cash Flow",
      unit: "inr-cr",
      latest: asMetric(
        fcfLatest.value,
        "inr-cr",
        src,
        fcfLatest.providerReported ? "Provider-reported free cash flow" : null,
      ),
      byPeriod: byPeriod(periods, src, "inr-cr", (p) => fcfOf(p).value),
    },
    {
      id: "fcf-margin",
      label: "FCF Margin",
      unit: "pct",
      latest: asMetric(
        fcfMargin(fcfLatest.value, latest?.revenue),
        "pct",
        src,
      ),
      byPeriod: byPeriod(periods, src, "pct", (p) =>
        fcfMargin(fcfOf(p).value, p.revenue),
      ),
    },
    {
      id: "fcf-conversion",
      label: "FCF Conversion",
      unit: "multiple",
      latest: asMetric(
        safeDiv(fcfLatest.value, latest?.ebitda),
        "multiple",
        src,
        "FCF / EBITDA",
      ),
      byPeriod: byPeriod(periods, src, "multiple", (p) =>
        safeDiv(fcfOf(p).value, p.ebitda),
      ),
    },
    {
      id: "capex-revenue",
      label: "Capex / Revenue",
      unit: "pct",
      latest: asMetric(
        latest ? capexRevenuePct(latest.capex, latest.revenue) : null,
        "pct",
        src,
      ),
      byPeriod: byPeriod(periods, src, "pct", (p) =>
        capexRevenuePct(p.capex, p.revenue),
      ),
    },
  ];

  /* Operating efficiency (1E) ------------------------------------------- */
  const cogsReliable =
    latest !== null && finite(latest.cogs) && latest.cogs > 0;
  const cogsOk = (p: NormalizedPeriod): boolean =>
    finite(p.cogs) && p.cogs > 0;
  const efficiency: XRayRow[] = [
    {
      id: "receivable-days",
      label: "Receivable Days",
      unit: "days",
      latest: asMetric(
        latest ? dso(latest.receivables, latest.revenue) : null,
        "days",
        src,
      ),
      byPeriod: byPeriod(periods, src, "days", (p) =>
        dso(p.receivables, p.revenue),
      ),
    },
    isBank
      ? naRow(
          "inventory-days",
          "Inventory Days",
          "days",
          src,
          "Not applicable to banks/NBFCs",
        )
      : !cogsReliable
        ? naRow(
            "inventory-days",
            "Inventory Days",
            "days",
            src,
            "Requires reliable COGS",
          )
        : {
            id: "inventory-days",
            label: "Inventory Days",
            unit: "days" as MetricUnit,
            latest: asMetric(
              latest ? dio(latest.inventory, latest.cogs) : null,
              "days",
              src,
            ),
            byPeriod: byPeriod(periods, src, "days", (p) =>
              cogsOk(p) ? dio(p.inventory, p.cogs) : null,
            ),
          },
    !cogsReliable
      ? naRow(
          "payable-days",
          "Payable Days",
          "days",
          src,
          "Requires reliable COGS",
        )
      : {
          id: "payable-days",
          label: "Payable Days",
          unit: "days" as MetricUnit,
          latest: asMetric(
            latest ? dpo(latest.payables, latest.cogs) : null,
            "days",
            src,
          ),
          byPeriod: byPeriod(periods, src, "days", (p) =>
            cogsOk(p) ? dpo(p.payables, p.cogs) : null,
          ),
        },
    isBank
      ? naRow(
          "ccc",
          "Cash Conversion Cycle",
          "days",
          src,
          "Not applicable to banks/NBFCs",
        )
      : !cogsReliable
        ? naRow(
            "ccc",
            "Cash Conversion Cycle",
            "days",
            src,
            "Requires reliable COGS",
          )
        : {
            id: "ccc",
            label: "Cash Conversion Cycle",
            unit: "days" as MetricUnit,
            latest: asMetric(
              latest
                ? ccc(
                    dso(latest.receivables, latest.revenue),
                    dio(latest.inventory, latest.cogs),
                    dpo(latest.payables, latest.cogs),
                  )
                : null,
              "days",
              src,
            ),
            byPeriod: byPeriod(periods, src, "days", (p) =>
              cogsOk(p)
                ? ccc(
                    dso(p.receivables, p.revenue),
                    dio(p.inventory, p.cogs),
                    dpo(p.payables, p.cogs),
                  )
                : null,
            ),
          },
    {
      id: "asset-turnover",
      label: "Asset Turnover",
      unit: "multiple",
      latest: asMetric(
        latest && finite(avgTA) && avgTA > 0
          ? safeDiv(latest.revenue, avgTA)
          : null,
        "multiple",
        src,
        "Average total assets over available reported periods",
      ),
      byPeriod: byPeriod(periods, src, "multiple", (p) =>
        finite(avgTA) && avgTA > 0 ? safeDiv(p.revenue, avgTA) : null,
      ),
    },
  ];

  /* Historical trends (1F) ----------------------------------------------- */
  const trendDefs: Array<{
    id: string;
    label: string;
    unit: MetricUnit;
    get: (p: NormalizedPeriod) => number | null | undefined;
  }> = [
    { id: "trend-revenue", label: "Revenue", unit: "inr-cr", get: (p) => p.revenue },
    { id: "trend-ebitda", label: "EBITDA", unit: "inr-cr", get: (p) => p.ebitda },
    { id: "trend-pat", label: "PAT", unit: "inr-cr", get: (p) => p.pat },
    { id: "trend-cfo", label: "CFO", unit: "inr-cr", get: (p) => p.cfo },
    { id: "trend-fcf", label: "FCF", unit: "inr-cr", get: (p) => fcfOf(p).value },
    {
      id: "trend-ebitda-margin",
      label: "EBITDA Margin",
      unit: "pct",
      get: (p) => ebitdaMargin(p.ebitda, p.revenue),
    },
    { id: "trend-roe", label: "ROE", unit: "pct", get: (p) => roe(p.pat, avgEq) },
    { id: "trend-roce", label: "ROCE", unit: "pct", get: (p) => roce(p.ebit, avgCE) },
    {
      id: "trend-net-debt",
      label: "Net Debt",
      unit: "inr-cr",
      get: (p) => netDebt(p.totalDebt, p.cash),
    },
  ];
  const trends: XRayTrend[] = trendDefs.map(({ id, label, unit, get }) => ({
    id,
    label,
    unit,
    points: periods.map((p) => {
      const v = get(p);
      return { periodKey: p.key, value: finite(v) ? v : null };
    }),
  }));

  return {
    periods: periods.map((p) => ({ key: p.key, label: p.label })),
    growth,
    profitability,
    health,
    cashQuality,
    efficiency,
    trends,
    asOf: latest ? latest.label : "",
    source: src,
  };
}
