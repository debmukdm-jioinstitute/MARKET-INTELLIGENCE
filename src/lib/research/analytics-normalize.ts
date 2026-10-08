/**
 * Normalize exchange filing financials into analytics-ready periods.
 *
 * Builder 3 (`normalize`) — Phase 1 research analytics.
 *
 * Reads the annual XBRL statement columns/rows from {@link FinancialsPayload}
 * (units: INR crores, per-share for `ps` lines) and maps them into
 * {@link NormalizedPeriod} entries, newest period last.
 *
 * Integrity rules:
 * - Missing row or null cell -> null. Never 0, never interpolated.
 * - Capex is normalized to a positive outflow via Math.abs BEFORE
 *   `freeCashFlow = cfo - capex`.
 * - EBIT is derived as pbt + interestExpense when both are present
 *   (preferred over any EBIT-tagged row).
 * - Rows are located by EXACT tag strings from src/lib/financials/lines.ts.
 */
import type {
  CompanyType,
  MetricSource,
  NormalizedPeriod,
} from "./analytics-types";
import { fcf, normalizeCapex } from "./analytics-math";
import type { FinancialsPayload, StatementRow } from "../financials/types";

/* ------------------------------------------------------------------ */
/* Company type detection                                              */
/* ------------------------------------------------------------------ */

/**
 * Classify a company from its industry label.
 *
 * - null/undefined/"" -> "unknown"
 * - matches /bank|nbfc|housing finance/i -> "bank-nbfc"
 * - anything else -> "industrial"
 */
export function detectCompanyType(industry?: string | null): CompanyType {
  if (!industry) return "unknown";
  return /bank|nbfc|housing finance/i.test(industry) ? "bank-nbfc" : "industrial";
}

/* ------------------------------------------------------------------ */
/* Row lookup                                                          */
/* ------------------------------------------------------------------ */

type RowMap = Map<string, StatementRow>;

const toRowMap = (rows: StatementRow[]): RowMap => new Map(rows.map((r) => [r.tag, r]));

const finiteOrNull = (v: number | null | undefined): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

/** Exact tag lookup; first matching tag wins. Missing row or null cell -> null. */
const cell = (rows: RowMap, tags: string[], periodKey: string): number | null => {
  for (const tag of tags) {
    const row = rows.get(tag);
    if (!row) continue;
    const v = row.values?.[periodKey];
    if (v === undefined || v === null) continue;
    return finiteOrNull(v);
  }
  return null;
};

/* ------------------------------------------------------------------ */
/* Tag mapping (EXACT tag strings from src/lib/financials/lines.ts)    */
/* ------------------------------------------------------------------ */

/**
 * For each NormalizedPeriod field: candidate tags, in priority order.
 * First tag present with a finite value for the period wins.
 *
 * General (Ind-AS) layout is the primary source; bank-layout tags are
 * included as fallbacks so banks degrade with real values where the
 * line exists instead of dropping to null.
 */
const FIELD_TAGS: Record<string, string[]> = {
  revenue: ["RevenueFromOperations", "InterestEarned"],
  grossProfit: [], // no reliable single tag; honest null
  // ebitda: derived via the repo's canonical operating-profit definition
  // (see deriveEbitda below); no reliable single tag.
  ebitda: [],
  // ebit: derived as pbt + interestExpense (preferred); fallbacks below
  ebit: [],
  pbt: ["ProfitBeforeTax", "ProfitLossFromOrdinaryActivitiesBeforeTax"],
  pat: ["ProfitLossForPeriod", "ProfitLossFromOrdinaryActivitiesAfterTax"],
  eps: [
    "BasicEarningsLossPerShareFromContinuingAndDiscontinuedOperations",
    "BasicEarningsPerShareAfterExtraordinaryItems",
  ],
  cfo: ["CashFlowsFromUsedInOperatingActivities"],
  capex: [
    "PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities",
    "PurchaseOfIntangibleAssetsClassifiedAsInvestingActivities",
  ],
  totalAssets: ["Assets"],
  totalEquity: ["Equity"],
  // totalDebt: derived as BorrowingsNoncurrent + BorrowingsCurrent
  // (mirrors deriveFinancialRatios in src/lib/financials/ratios.ts).
  totalDebt: [],
  cash: [
    "CashAndCashEquivalents",
    "CashAndBalancesWithReserveBankOfIndia",
  ],
  currentAssets: ["CurrentAssets"],
  currentLiabilities: ["CurrentLiabilities"],
  inventory: ["Inventories"],
  receivables: ["TradeReceivablesCurrent"],
  payables: ["TradePayablesCurrent"],
  interestExpense: ["FinanceCosts", "InterestExpended"],
  // sharesOutstanding: derived as paid-up capital / face value (see below).
  sharesOutstanding: [],
  otherIncome: ["OtherIncome"],
  cogs: [], // no XBRL tag; sourced from payload.workingCapital.annuals instead
};

/**
 * EBITDA via the repo's canonical operating-profit definition
 * (src/lib/financials/ratios.ts `deriveFinancialRatios`):
 * revenue − (expenses − depreciation − finance costs); bank layout falls
 * back to OperatingProfitBeforeProvisionAndContingencies. All inputs must be
 * present and finite, otherwise null (never approximated).
 */
const deriveEbitda = (
  pl: RowMap,
  revenue: number | null,
  periodKey: string,
  isBank: boolean,
): number | null => {
  if (isBank) return cell(pl, ["OperatingProfitBeforeProvisionAndContingencies"], periodKey);
  if (revenue === null || revenue <= 0) return null;
  const exp =
    cell(pl, ["Expenses"], periodKey) ?? cell(pl, ["OperatingExpenses"], periodKey);
  const financeCosts = cell(pl, ["FinanceCosts"], periodKey);
  if (exp === null || financeCosts === null) return null;
  const dep = cell(pl, ["DepreciationDepletionAndAmortisationExpense"], periodKey) ?? 0;
  const v = revenue - (exp - dep - financeCosts);
  return Number.isFinite(v) ? v : null;
};

/**
 * Total debt = BorrowingsNoncurrent + BorrowingsCurrent, falling back to the
 * Borrowings total line. Mirrors deriveFinancialRatios in
 * src/lib/financials/ratios.ts. A present-but-zero row yields 0 (debt-free),
 * not null.
 */
const deriveTotalDebt = (bs: RowMap, periodKey: string): number | null => {
  const nc = cell(bs, ["BorrowingsNoncurrent"], periodKey);
  const cur = cell(bs, ["BorrowingsCurrent"], periodKey);
  if (nc !== null || cur !== null) return (nc ?? 0) + (cur ?? 0);
  return cell(bs, ["Borrowings"], periodKey);
};

/**
 * Shares outstanding = paid-up equity capital / face value per share.
 * Paid-up is reported in INR crores, face value in INR per share.
 */
const deriveSharesOutstanding = (bs: RowMap, periodKey: string): number | null => {
  const paidUpCr = cell(bs, ["PaidUpValueOfEquityShareCapital"], periodKey);
  const faceValue = cell(bs, ["FaceValueOfEquityShareCapital"], periodKey);
  if (paidUpCr === null || faceValue === null || faceValue <= 0) return null;
  const v = (paidUpCr * 1e7) / faceValue;
  return Number.isFinite(v) && v > 0 ? v : null;
};

const plOf = (payload: FinancialsPayload): RowMap => toRowMap(payload.pl.annuals ?? []);
const bsOf = (payload: FinancialsPayload): RowMap => toRowMap(payload.bs.annuals ?? []);
const cfOf = (payload: FinancialsPayload): RowMap => toRowMap(payload.cf.annuals ?? []);

/** cogs fallback: payload.workingCapital.annuals has per-period cogs (INR cr). */
const workingCapitalCogs = (payload: FinancialsPayload, periodKey: string): number | null => {
  const wc = (payload.workingCapital?.annuals ?? []).find((w) => w.periodKey === periodKey);
  return finiteOrNull(wc?.cogs ?? null);
};

/* ------------------------------------------------------------------ */
/* normalizeFinancials                                                 */
/* ------------------------------------------------------------------ */

export function normalizeFinancials(payload: FinancialsPayload): {
  periods: NormalizedPeriod[];
  companyType: CompanyType;
} {
  const pl = plOf(payload);
  const bs = bsOf(payload);
  const cf = cfOf(payload);

  // Newest last; keep at most the 10 most recent annual periods.
  const columns = [...(payload.annuals ?? [])]
    .sort((a, b) => (a.endDate < b.endDate ? -1 : a.endDate > b.endDate ? 1 : 0))
    .slice(-10);

  const official = payload.officialSources?.[0];
  const retrievedAt = new Date().toISOString();

  const periods: NormalizedPeriod[] = columns.map((col) => {
    const key = col.key;
    const get = (field: string): number | null => {
      const tags = FIELD_TAGS[field] ?? [];
      const rowMaps: RowMap[] = [pl, bs, cf];
      for (const rows of rowMaps) {
        const v = cell(rows, tags, key);
        if (v !== null) return v;
      }
      return null;
    };

    const pbt = get("pbt");
    const interestExpense = get("interestExpense");
    const cfoRaw = get("cfo");
    const capexRaw = get("capex");
    const revenue = get("revenue");

    const capex = normalizeCapex(capexRaw); // negative reported outflow -> positive
    const freeCashFlow = fcf(cfoRaw, capex);

    // EBITDA via the canonical operating-profit definition (ratios.ts).
    const ebitda = deriveEbitda(pl, revenue, key, payload.layout === "bank");

    // EBIT: prefer pbt + interestExpense when both present.
    const ebit =
      typeof pbt === "number" && typeof interestExpense === "number"
        ? pbt + interestExpense
        : get("ebit");

    const totalDebt = deriveTotalDebt(bs, key);
    const sharesOutstanding = deriveSharesOutstanding(bs, key);

    const cogs = workingCapitalCogs(payload, key);

    const source: MetricSource = {
      provider: official?.provider ?? "NSE",
      sourceType: "company_filing",
      ...(official?.url ? { sourceUrl: official.url } : {}),
      ...(col.filingDate ? { filingDate: col.filingDate } : {}),
      period: col.label,
      retrievedAt,
    };

    return {
      key,
      label: col.label,
      endDate: col.endDate,
      filingDate: col.filingDate ?? null,
      revenue,
      grossProfit: get("grossProfit"),
      ebitda,
      ebit,
      pbt,
      pat: get("pat"),
      eps: get("eps"),
      cfo: cfoRaw,
      capex,
      freeCashFlow,
      totalAssets: get("totalAssets"),
      totalEquity: get("totalEquity"),
      totalDebt,
      cash: get("cash"),
      currentAssets: get("currentAssets"),
      currentLiabilities: get("currentLiabilities"),
      inventory: get("inventory"),
      receivables: get("receivables"),
      payables: get("payables"),
      interestExpense,
      sharesOutstanding,
      otherIncome: get("otherIncome"),
      cogs,
      source,
    } satisfies NormalizedPeriod;
  });

  // The XBRL layout signals banks ("bank" | "general"); the payload carries no
  // industry/sector field, so a bank layout maps straight to bank-nbfc.
  // Unknown layouts stay "unknown" (engines treat it as industrial).
  const companyType =
    payload.layout === "bank" ? "bank-nbfc" : detectCompanyType(undefined);

  return { periods, companyType };
}
