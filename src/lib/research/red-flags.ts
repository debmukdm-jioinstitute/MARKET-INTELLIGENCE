/**
 * Red Flag Engine (Phase 1).
 *
 * Deterministic, rules-based detection of unusual financial patterns in
 * normalized annual periods. Flags indicate areas worth further
 * investigation; they do not imply misconduct or a bad investment.
 *
 * Spec: MARKET_INTELLIGENCE_RESEARCH_PHASE1_ANTIGRAVITY.md, FEATURE 3.
 *
 * Conventions:
 * - Each rule is gated by the RULES table; a disabled rule is skipped
 *   entirely (no flags emitted).
 * - Every rule needs >= 2 comparable periods or it stays silent.
 * - Periods are sorted ascending by endDate; "latest" = most recent.
 * - "unknown" companyType is treated as industrial.
 * - Output severity order: high, warning, watch, info.
 */
import {
  ccc,
  cfoToPat,
  dio,
  dpo,
  dso,
  ebitdaMargin,
  fcf as fcfFromCfo,
  interestCoverage,
  netDebt,
  normalizeCapex,
  safeDiv,
  yoy,
} from "./analytics-math";
import type {
  CompanyType,
  MetricSource,
  NormalizedPeriod,
} from "./analytics-types";

export type ResearchFlag = {
  id: string;
  title: string;
  severity: "info" | "watch" | "warning" | "high";
  summary: string;
  evidence: { label: string; value: string }[];
  sourcePeriods: string[];
  methodology: string;
};

export type RedFlagResult = {
  flags: ResearchFlag[];
  positives: string[];
  asOf: string;
  source: MetricSource;
};

export const RULES: { id: string; enabled: boolean; description: string }[] = [
  {
    id: "receivables-vs-revenue",
    enabled: true,
    description:
      "Receivables YoY growth outpacing revenue YoY growth by 15+ percentage points (escalates to warning when the pattern repeats in the prior year)",
  },
  {
    id: "cfo-below-pat",
    enabled: true,
    description:
      "CFO / PAT below 0.70 with PAT > 0 (escalates to warning when seen in 2+ of the last 3 annual periods)",
  },
  {
    id: "negative-fcf-profitable",
    enabled: true,
    description:
      "PAT > 0 with free cash flow < 0 (watch for one year, warning when seen in 2+ of the last 3 annual periods)",
  },
  {
    id: "rapid-debt-growth",
    enabled: true,
    description:
      "Total debt up more than 30% YoY, shown with revenue and EBITDA context (industrial companies only; never automatically labelled bad)",
  },
  {
    id: "interest-coverage",
    enabled: true,
    description:
      "Interest coverage below 2x, or a >40% YoY fall from a base of 3x or better (industrial companies only)",
  },
  {
    id: "margin-compression",
    enabled: true,
    description:
      "EBITDA margin decline of 300+ bps YoY (both periods required)",
  },
  {
    id: "working-capital",
    enabled: true,
    description:
      "Receivable days or cash conversion cycle worsening materially YoY (20%+ rise; industrial companies only)",
  },
  {
    id: "other-income",
    enabled: true,
    description:
      "Other income at 25%+ of PBT; skips cleanly when otherIncome / PBT cannot be computed",
  },
  {
    id: "dilution",
    enabled: false,
    description:
      "Enable when corporate-action-adjusted share counts are available",
  },
  {
    id: "repeated-losses",
    enabled: true,
    description:
      "Negative PAT in 2+ of the last 3 annual periods, stated factually",
  },
];

/* ---------- helpers ---------- */

const ruleEnabled = (id: string): boolean => {
  const entry = RULES.find((r) => r.id === id);
  return entry !== undefined && entry.enabled;
};

const finite = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

const sortedPeriods = (periods: NormalizedPeriod[]): NormalizedPeriod[] =>
  [...periods].sort((a, b) =>
    String(a.endDate ?? "").localeCompare(String(b.endDate ?? "")),
  );

const takeLast = <T>(arr: T[], n: number): T[] => arr.slice(Math.max(0, arr.length - n));

const fmtPct = (fraction: number): string => `${(fraction * 100).toFixed(1)}%`;
const fmtPp = (fraction: number): string => `${(fraction * 100).toFixed(1)}pp`;
const fmtMult = (x: number): string => `${x.toFixed(2)}x`;
const fmtDays = (d: number): string => `${d.toFixed(0)} days`;
const fmtCr = (v: number): string =>
  `${v < 0 ? "-" : ""}₹${Math.abs(v).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })} cr`;

/** Period FCF: prefer the reported field, else derive from CFO - capex outflow. */
const periodFcf = (p: NormalizedPeriod): number | null => {
  if (finite(p.freeCashFlow)) return p.freeCashFlow;
  return fcfFromCfo(p.cfo, normalizeCapex(p.capex));
};

/** Cash conversion cycle for one period; null when any leg is missing. */
const periodCcc = (p: NormalizedPeriod): number | null => {
  const dsoV = dso(p.receivables, p.revenue);
  const dioV = dio(p.inventory, p.cogs);
  const dpoV = dpo(p.payables, p.cogs);
  return ccc(dsoV, dioV, dpoV);
};

const severityRank = (s: ResearchFlag["severity"]): number =>
  s === "high" ? 0 : s === "warning" ? 1 : s === "watch" ? 2 : 3;

type Ctx = { ps: NormalizedPeriod[]; isBankNbfc: boolean };

/* ---------- rules ---------- */

function ruleReceivablesVsRevenue({ ps }: Ctx): ResearchFlag | null {
  const cur = ps[ps.length - 1];
  const prev = ps[ps.length - 2];
  const recvYoY = yoy(cur.receivables, prev.receivables);
  const revYoY = yoy(cur.revenue, prev.revenue);
  if (!finite(recvYoY) || !finite(revYoY)) return null;
  const gap = recvYoY - revYoY;
  if (gap < 0.15) return null;
  let escalated = false;
  if (ps.length >= 3) {
    const pp = ps[ps.length - 3];
    const prevRecvYoY = yoy(prev.receivables, pp.receivables);
    const prevRevYoY = yoy(prev.revenue, pp.revenue);
    if (finite(prevRecvYoY) && finite(prevRevYoY) && prevRecvYoY - prevRevYoY >= 0.15) {
      escalated = true;
    }
  }
  const severity = escalated ? "warning" : "watch";
  return {
    id: "receivables-vs-revenue",
    title: "Receivables growing materially faster than revenue",
    severity,
    summary: `Receivables grew ${fmtPp(gap)} faster than revenue in ${
      cur.label
    }.${escalated ? " The same pattern was also present in the prior year." : ""}`,
    evidence: [
      { label: "Receivables YoY growth", value: fmtPct(recvYoY) },
      { label: "Revenue YoY growth", value: fmtPct(revYoY) },
      { label: "Growth gap", value: fmtPp(gap) },
    ],
    sourcePeriods: [prev.label, cur.label],
    methodology: "Receivables YoY growth - revenue YoY growth >= 15pp",
  };
}

function ruleCfoBelowPat({ ps }: Ctx): ResearchFlag | null {
  const recent = takeLast(ps, 3);
  const flagged = recent.filter((p) => {
    const ratio = cfoToPat(p.cfo, p.pat);
    return finite(ratio) && ratio < 0.7;
  });
  if (flagged.length === 0) return null;
  const last = flagged[flagged.length - 1];
  const ratio = cfoToPat(last.cfo, last.pat) as number;
  const severity = flagged.length >= 2 ? "warning" : "watch";
  return {
    id: "cfo-below-pat",
    title: "Cash flow materially below reported profit",
    severity,
    summary: `Operating cash flow was below 70% of reported PAT in ${flagged.length} of the last ${recent.length} annual periods (most recently ${last.label}).`,
    evidence: [
      { label: `${last.label} PAT`, value: fmtCr(last.pat as number) },
      { label: `${last.label} CFO`, value: fmtCr(last.cfo as number) },
      { label: "CFO / PAT", value: fmtMult(ratio) },
    ],
    sourcePeriods: flagged.map((p) => p.label),
    methodology: "CFO / PAT < 0.70 with PAT > 0",
  };
}

function ruleNegativeFcfProfitable({ ps }: Ctx): ResearchFlag | null {
  const recent = takeLast(ps, 3);
  const flagged = recent.filter(
    (p) =>
      finite(p.pat) && (p.pat as number) > 0 && finite(periodFcf(p)) && (periodFcf(p) as number) < 0,
  );
  if (flagged.length === 0) return null;
  const last = flagged[flagged.length - 1];
  const severity = flagged.length >= 2 ? "warning" : "watch";
  return {
    id: "negative-fcf-profitable",
    title: "Negative free cash flow despite positive profits",
    severity,
    summary: `Reported profits were positive but free cash flow was negative in ${flagged.length} of the last ${recent.length} annual periods (most recently ${last.label}).`,
    evidence: [
      { label: `${last.label} PAT`, value: fmtCr(last.pat as number) },
      { label: `${last.label} FCF`, value: fmtCr(periodFcf(last) as number) },
    ],
    sourcePeriods: flagged.map((p) => p.label),
    methodology: "PAT > 0 AND FCF < 0",
  };
}

function ruleRapidDebtGrowth({ ps, isBankNbfc }: Ctx): ResearchFlag | null {
  if (isBankNbfc) return null;
  const cur = ps[ps.length - 1];
  const prev = ps[ps.length - 2];
  const debtYoY = yoy(cur.totalDebt, prev.totalDebt);
  if (!finite(debtYoY) || debtYoY <= 0.3) return null;
  const revYoY = yoy(cur.revenue, prev.revenue);
  const ebitdaYoY = yoy(cur.ebitda, prev.ebitda);
  return {
    id: "rapid-debt-growth",
    title: "Rapid debt increase",
    severity: "watch",
    summary: `Total debt rose ${fmtPct(debtYoY)} YoY in ${cur.label}. A debt increase is not automatically negative; revenue and EBITDA context is shown below.`,
    evidence: [
      { label: "Total debt YoY growth", value: fmtPct(debtYoY) },
      { label: "Revenue YoY growth", value: finite(revYoY) ? fmtPct(revYoY as number) : "n/a" },
      { label: "EBITDA YoY growth", value: finite(ebitdaYoY) ? fmtPct(ebitdaYoY as number) : "n/a" },
    ],
    sourcePeriods: [prev.label, cur.label],
    methodology: "Total debt YoY growth > 30%",
  };
}

function ruleInterestCoverage({ ps, isBankNbfc }: Ctx): ResearchFlag | null {
  if (isBankNbfc) return null;
  const cur = ps[ps.length - 1];
  const prev = ps[ps.length - 2];
  const curCov = interestCoverage(cur.ebit, cur.interestExpense);
  const prevCov = interestCoverage(prev.ebit, prev.interestExpense);
  if (finite(curCov) && curCov < 2) {
    return {
      id: "interest-coverage",
      title: "Interest coverage deterioration",
      severity: "warning",
      summary: `Interest coverage was ${fmtMult(curCov)} in ${cur.label}, below 2x.`,
      evidence: [
        { label: "Interest coverage (current)", value: fmtMult(curCov) },
        {
          label: "Interest coverage (prior)",
          value: finite(prevCov) ? fmtMult(prevCov as number) : "n/a",
        },
      ],
      sourcePeriods: [prev.label, cur.label],
      methodology: "Interest coverage < 2x",
    };
  }
  if (
    finite(curCov) &&
    finite(prevCov) &&
    (prevCov as number) >= 3 &&
    (prevCov as number) > 0 &&
    ((prevCov as number) - (curCov as number)) / (prevCov as number) > 0.4
  ) {
    const fall = (((prevCov as number) - (curCov as number)) / (prevCov as number));
    return {
      id: "interest-coverage",
      title: "Interest coverage deterioration",
      severity: "watch",
      summary: `Interest coverage fell ${fmtPct(fall)} YoY in ${cur.label} from a base above 3x.`,
      evidence: [
        { label: "Interest coverage (prior)", value: fmtMult(prevCov as number) },
        { label: "Interest coverage (current)", value: fmtMult(curCov as number) },
        { label: "YoY decline", value: fmtPct(fall) },
      ],
      sourcePeriods: [prev.label, cur.label],
      methodology: "Interest coverage fell >40% YoY from >= 3x",
    };
  }
  return null;
}

function ruleMarginCompression({ ps }: Ctx): ResearchFlag | null {
  const cur = ps[ps.length - 1];
  const prev = ps[ps.length - 2];
  const curM = ebitdaMargin(cur.ebitda, cur.revenue);
  const prevM = ebitdaMargin(prev.ebitda, prev.revenue);
  if (!finite(curM) || !finite(prevM)) return null;
  const decline = (prevM as number) - (curM as number); // percentage points; 300bps = 3.0
  if (decline < 3) return null;
  return {
    id: "margin-compression",
    title: "Margin compression",
    severity: "watch",
    summary: `EBITDA margin compressed by ${decline.toFixed(0)}bps YoY in ${cur.label}.`,
    evidence: [
      { label: "EBITDA margin (prior)", value: fmtPct((prevM as number) / 100) },
      { label: "EBITDA margin (current)", value: fmtPct((curM as number) / 100) },
      { label: "Compression", value: `${decline.toFixed(0)}bps` },
    ],
    sourcePeriods: [prev.label, cur.label],
    methodology: "EBITDA margin decline >= 300bps YoY",
  };
}

function ruleWorkingCapital({ ps, isBankNbfc }: Ctx): ResearchFlag | null {
  if (isBankNbfc) return null;
  const cur = ps[ps.length - 1];
  const prev = ps[ps.length - 2];
  const curDso = dso(cur.receivables, cur.revenue);
  const prevDso = dso(prev.receivables, prev.revenue);
  const curCcc = periodCcc(cur);
  const prevCcc = periodCcc(prev);
  const signals: string[] = [];
  const evidence: { label: string; value: string }[] = [];
  if (finite(curDso) && finite(prevDso) && (prevDso as number) > 0) {
    const rise = ((curDso as number) - (prevDso as number)) / (prevDso as number);
    if (rise >= 0.2) {
      signals.push("receivable days");
      evidence.push(
        { label: "Receivable days (prior)", value: fmtDays(prevDso as number) },
        { label: "Receivable days (current)", value: fmtDays(curDso as number) },
        { label: "YoY rise", value: fmtPct(rise) },
      );
    }
  }
  if (finite(curCcc) && finite(prevCcc) && (prevCcc as number) > 0) {
    const rise = ((curCcc as number) - (prevCcc as number)) / (prevCcc as number);
    if (rise >= 0.2) {
      signals.push("cash conversion cycle");
      evidence.push(
        { label: "Cash conversion cycle (prior)", value: fmtDays(prevCcc as number) },
        { label: "Cash conversion cycle (current)", value: fmtDays(curCcc as number) },
        { label: "YoY rise", value: fmtPct(rise) },
      );
    }
  }
  if (signals.length === 0) return null;
  return {
    id: "working-capital",
    title: "Working-capital deterioration",
    severity: "watch",
    summary: `Working capital worsened in ${cur.label}: ${signals.join(" and ")} rose materially YoY.`,
    evidence,
    sourcePeriods: [prev.label, cur.label],
    methodology: "Receivable days or cash conversion cycle up >= 20% YoY",
  };
}

function ruleOtherIncome({ ps }: Ctx): ResearchFlag | null {
  const cur = ps[ps.length - 1];
  if (!finite(cur.pbt) || (cur.pbt as number) <= 0 || !finite(cur.otherIncome)) return null;
  const ratio = safeDiv(cur.otherIncome, cur.pbt);
  if (!finite(ratio) || (ratio as number) < 0.25) return null;
  return {
    id: "other-income",
    title: "Other income dependency",
    severity: "info",
    summary: `Other income was ${fmtPct(ratio as number)} of PBT in ${cur.label}, indicating notable dependence on non-operating income.`,
    evidence: [
      { label: "Other income", value: fmtCr(cur.otherIncome as number) },
      { label: "PBT", value: fmtCr(cur.pbt as number) },
      { label: "Other income / PBT", value: fmtPct(ratio as number) },
    ],
    sourcePeriods: [cur.label],
    methodology: "Other income / PBT >= 25%",
  };
}

function ruleRepeatedLosses({ ps }: Ctx): ResearchFlag | null {
  const recent = takeLast(ps, 3);
  const losses = recent.filter((p) => finite(p.pat) && (p.pat as number) < 0);
  if (losses.length < 2) return null;
  return {
    id: "repeated-losses",
    title: "Repeated losses",
    severity: "warning",
    summary: `Reported losses in ${losses.length} of the last ${recent.length} annual periods.`,
    evidence: losses.map((p) => ({
      label: `${p.label} PAT`,
      value: fmtCr(p.pat as number),
    })),
    sourcePeriods: losses.map((p) => p.label),
    methodology: "PAT < 0 in >= 2 of the last 3 annual periods",
  };
}

/* ---------- positives ---------- */

function collectPositives(ps: NormalizedPeriod[]): string[] {
  const positives: string[] = [];
  const last4 = takeLast(ps, 4);
  const nds = last4.map((p) => netDebt(p.totalDebt, p.cash));
  if (
    nds.length === 4 &&
    nds.every(finite) &&
    (nds[3] as number) < (nds[2] as number) &&
    (nds[2] as number) < (nds[1] as number) &&
    (nds[1] as number) < (nds[0] as number)
  ) {
    positives.push("Net debt declined for 3 consecutive reported years");
  }
  const last3 = takeLast(ps, 3);
  if (
    last3.length === 3 &&
    last3.every(
      (p) =>
        finite(p.cfo) &&
        finite(p.pat) &&
        (p.pat as number) > 0 &&
        (p.cfo as number) > (p.pat as number),
    )
  ) {
    positives.push("CFO exceeded PAT across the latest 3 annual periods");
  }
  return positives;
}

/* ---------- entry point ---------- */

export function detectRedFlags(
  periods: NormalizedPeriod[],
  companyType: CompanyType,
): RedFlagResult {
  const ps = sortedPeriods(periods);
  const ctx: Ctx = { ps, isBankNbfc: companyType === "bank-nbfc" }; // "unknown" behaves as industrial
  const flags: ResearchFlag[] = [];

  if (ps.length >= 2) {
    const run = (id: string, rule: (ctx: Ctx) => ResearchFlag | null) => {
      if (!ruleEnabled(id)) return;
      const flag = rule(ctx);
      if (flag) flags.push(flag);
    };
    run("receivables-vs-revenue", ruleReceivablesVsRevenue);
    run("cfo-below-pat", ruleCfoBelowPat);
    run("negative-fcf-profitable", ruleNegativeFcfProfitable);
    run("rapid-debt-growth", ruleRapidDebtGrowth);
    run("interest-coverage", ruleInterestCoverage);
    run("margin-compression", ruleMarginCompression);
    run("working-capital", ruleWorkingCapital);
    run("other-income", ruleOtherIncome);
    // "dilution" is disabled: skipped entirely, emits nothing.
    run("repeated-losses", ruleRepeatedLosses);
  }

  flags.sort((a, b) => severityRank(a.severity) - severityRank(b.severity));

  const positives = collectPositives(ps);
  if (flags.length === 0) {
    positives.push("No major balance-sheet flags detected from available reported data.");
  }

  const last = ps[ps.length - 1];
  const source: MetricSource = last
    ? {
        provider: last.source?.provider ?? "company filings",
        sourceType: "derived",
        period: last.label,
        inputs: RULES.filter((r) => r.enabled).map((r) => r.id),
      }
    : { provider: "company filings", sourceType: "derived" };

  return {
    flags,
    positives,
    asOf: last ? last.label : "",
    source,
  };
}
