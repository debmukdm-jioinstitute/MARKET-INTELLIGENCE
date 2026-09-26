/**
 * Market Intelligence metrics — implementations follow
 * docs/market_intelligence_metrics_specification.md (§0–§9).
 * Daily equity series use A = 252 trading days unless noted.
 */

export const SPEC_DOC = "docs/market_intelligence_metrics_specification.md";
export const TRADING_DAYS_PER_YEAR = 252;

export type NavPoint = { date: string; value: number };

export type SpecInputs = {
  nav: NavPoint[];
  portfolioReturns: number[];
  benchmarkReturns: number[];
  riskFreeAnnual: number;
  navInr: number;
  tradeFlows?: { amount: number; days: number }[];
};

export type SpecMetrics = {
  absoluteReturn: number;
  cagr: number | null;
  cagrFlagShortPeriod: boolean;
  twr: number;
  mwrIrr: number | null;
  rollingReturnAnn: number | null;
  activeReturnArithmetic: number;
  activeReturnGeometric: number;
  benchmarkReturn: number;
  sharpeAnn: number | null;
  treynorAnn: number | null;
  treynorNegativeBeta: boolean;
  sortinoAnn: number | null;
  jensensAlphaAnn: number;
  informationRatioAnn: number | null;
  calmar: number | null;
  sterling: number | null;
  burke: number | null;
  omega: number | null;
  kappa3: number | null;
  m2: number;
  appraisal: number | null;
  beta: number | null;
  alphaCapmAnn: number;
  volatilityAnn: number;
  var95Historical: number;
  cvar95Historical: number;
  trackingErrorAnn: number | null;
  downsideDeviationAnn: number;
  maxDrawdown: number;
  avgDrawdown: number;
  drawdownDurationDays: number;
  recoveryPeriodDays: number | null;
  recoveryUnrecovered: boolean;
  recoveryFactor: number | null;
  upsideCapture: number | null;
  downsideCapture: number | null;
  battingAverage: number | null;
};

function mean(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function stdevSample(values: number[]) {
  if (values.length < 2) return 0;
  const m = mean(values);
  const v = values.reduce((s, x) => s + (x - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(v);
}

function covarianceSample(a: number[], b: number[]) {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  const ma = mean(a.slice(0, n));
  const mb = mean(b.slice(0, n));
  let sum = 0;
  for (let i = 0; i < n; i += 1) sum += (a[i]! - ma) * (b[i]! - mb);
  return sum / (n - 1);
}

export function discreteReturns(nav: number[]) {
  const out: number[] = [];
  for (let i = 1; i < nav.length; i += 1) {
    const prev = nav[i - 1]!;
    if (prev <= 0) {
      out.push(0);
      continue;
    }
    out.push((nav[i]! - prev) / prev);
  }
  return out;
}

/** §1.1 */
export function absoluteReturn(P0: number, PT: number) {
  if (P0 <= 0) return Number.NaN;
  return (PT - P0) / P0;
}

/** §1.2 */
export function cagrFromDates(P0: number, PT: number, date0: string, dateT: string) {
  if (P0 <= 0) return { cagr: Number.NaN, shortPeriod: false };
  const y = (new Date(dateT).getTime() - new Date(date0).getTime()) / (365.25 * 24 * 3600 * 1000);
  const shortPeriod = y < 1 / 12;
  const M = PT / P0;
  if (M <= 0) return { cagr: -1, shortPeriod };
  if (y <= 0) return { cagr: Number.NaN, shortPeriod };
  const cagr = Math.exp(Math.log(M) / y) - 1;
  return { cagr, shortPeriod };
}

/** §1.3 — chained sub-period returns (daily NAV path; cash flows neutralized when NAV is mark-to-market). */
export function timeWeightedReturn(returns: number[]) {
  return returns.reduce((acc, r) => acc * (1 + r), 1) - 1;
}

/** §1.4 — Newton-Raphson IRR on day-based discounting. */
export function moneyWeightedIrr(flows: { amount: number; days: number }[], terminalNav: number, terminalDays: number) {
  const stream = [
    ...flows.map((f) => ({ amount: f.amount, days: f.days })),
    { amount: terminalNav, days: terminalDays },
  ];
  const npv = (r: number) =>
    stream.reduce((s, f) => s + f.amount / (1 + r) ** (f.days / 365), 0);
  const dnpv = (r: number) =>
    stream.reduce((s, f) => {
      const exp = f.days / 365 + 1;
      return s - (f.days / 365) * f.amount / (1 + r) ** exp;
    }, 0);

  let r = 0.1;
  for (let i = 0; i < 100; i += 1) {
    const f = npv(r);
    if (Math.abs(f) < 1e-7) return r;
    const fp = dnpv(r);
    if (Math.abs(fp) < 1e-12) break;
    r = r - f / fp;
    if (r <= -0.99) r = -0.99;
    if (r > 10) r = 10;
  }
  return null;
}

/** §1.5 — latest overlapping window, annualized via log returns. */
export function rollingReturnAnnualized(returns: number[], window = 21, A = TRADING_DAYS_PER_YEAR) {
  if (returns.length < window) return null;
  const slice = returns.slice(-window);
  const logSum = slice.reduce((s, r) => s + Math.log(1 + r), 0);
  return Math.exp(logSum * (A / window)) - 1;
}

/** §2.1 */
export function sharpeRatioAnn(p: number[], rfAnnual: number, A = TRADING_DAYS_PER_YEAR) {
  const rfD = rfAnnual / A;
  const sigma = stdevSample(p);
  if (sigma < 1e-12) return null;
  return ((mean(p) - rfD) / sigma) * Math.sqrt(A);
}

/** §2.3 Sortino — population downside deviation, MAR = R_f daily. */
export function sortinoRatioAnn(p: number[], rfAnnual: number, A = TRADING_DAYS_PER_YEAR) {
  const mar = rfAnnual / A;
  const downside = p.map((r) => Math.min(0, r - mar));
  const sigmaD = Math.sqrt(mean(downside.map((d) => d * d)));
  if (sigmaD < 1e-12) return null;
  return ((mean(p) - mar) / sigmaD) * Math.sqrt(A);
}

/** §3.1 Beta */
export function beta(p: number[], b: number[]) {
  const n = Math.min(p.length, b.length);
  if (n < 2) return null;
  const bp = b.slice(-n);
  const pp = p.slice(-n);
  const varB = stdevSample(bp) ** 2;
  if (varB < 1e-12) return null;
  return covarianceSample(pp, bp) / varB;
}

/** §2.4 Jensen's Alpha — OLS intercept on excess returns (daily), annualized × A. */
export function jensenAlphaOLS(p: number[], b: number[], rfAnnual: number, A = TRADING_DAYS_PER_YEAR) {
  const n = Math.min(p.length, b.length);
  if (n < 3) return { alphaDaily: 0, beta: 0 };
  const rfD = rfAnnual / A;
  const y = p.slice(-n).map((r) => r - rfD);
  const x = b.slice(-n).map((r) => r - rfD);
  const mx = mean(x);
  const my = mean(y);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i += 1) {
    num += (x[i]! - mx) * (y[i]! - my);
    den += (x[i]! - mx) ** 2;
  }
  const betaHat = den > 1e-12 ? num / den : 0;
  const alphaDaily = my - betaHat * mx;
  return { alphaDaily, beta: betaHat };
}

/** §2.5 IR */
export function informationRatioAnn(p: number[], b: number[], A = TRADING_DAYS_PER_YEAR) {
  const n = Math.min(p.length, b.length);
  if (n < 2) return null;
  const diff = p.slice(-n).map((r, i) => r - b[i]!);
  const te = stdevSample(diff);
  if (te < 1e-12) return null;
  return (mean(diff) / te) * Math.sqrt(A);
}

/** §3.4 Historical VaR — 95% */
export function historicalVar(returns: number[], alpha = 0.05) {
  if (!returns.length) return 0;
  const sorted = [...returns].sort((a, b) => a - b);
  const k = Math.floor(alpha * sorted.length);
  return -sorted[Math.max(0, k)]!;
}

/** §3.5 CVaR */
export function historicalCvar(returns: number[], alpha = 0.05) {
  if (!returns.length) return 0;
  const sorted = [...returns].sort((a, b) => a - b);
  const k = Math.max(1, Math.floor(alpha * sorted.length));
  const tail = sorted.slice(0, k);
  return -mean(tail);
}

/** §4 Drawdown series */
export function drawdownMetrics(nav: number[]) {
  let peak = nav[0] ?? 0;
  let peakIdx = 0;
  let maxDd = 0;
  let maxDdPeakIdx = 0;
  let maxDdTroughIdx = 0;
  const dds: number[] = [];
  for (let i = 0; i < nav.length; i += 1) {
    const v = nav[i]!;
    if (v > peak) {
      peak = v;
      peakIdx = i;
    }
    const dd = peak > 0 ? v / peak - 1 : 0;
    dds.push(dd);
    if (dd < maxDd) {
      maxDd = dd;
      maxDdPeakIdx = peakIdx;
      maxDdTroughIdx = i;
    }
  }
  const avgDd = mean(dds.filter((d) => d < 0)) || 0;
  let recoveryIdx = -1;
  const peakAtMax = nav[maxDdPeakIdx]!;
  for (let i = maxDdTroughIdx; i < nav.length; i += 1) {
    if (nav[i]! >= peakAtMax) {
      recoveryIdx = i;
      break;
    }
  }
  const duration = recoveryIdx >= 0 ? recoveryIdx - maxDdPeakIdx : nav.length - 1 - maxDdPeakIdx;
  const recovery = recoveryIdx >= 0 ? recoveryIdx - maxDdTroughIdx : null;
  return {
    maxDrawdown: maxDd,
    avgDrawdown: avgDd,
    drawdownDurationDays: duration,
    recoveryPeriodDays: recovery,
    recoveryUnrecovered: recoveryIdx < 0,
    drawdowns: dds,
  };
}

/** §5.2 geometric capture */
export function captureRatios(p: number[], b: number[]) {
  const n = Math.min(p.length, b.length);
  const upP: number[] = [];
  const upB: number[] = [];
  const downP: number[] = [];
  const downB: number[] = [];
  for (let i = 0; i < n; i += 1) {
    const rb = b[i]!;
    const rp = p[i]!;
    if (rb > 0) {
      upP.push(rp);
      upB.push(rb);
    } else if (rb < 0) {
      downP.push(rp);
      downB.push(rb);
    }
  }
  const geom = (xs: number[]) => xs.reduce((acc, r) => acc * (1 + r), 1) - 1;
  const upside =
    upB.length && Math.abs(geom(upB)) > 1e-12 ? geom(upP) / geom(upB) : null;
  const downside =
    downB.length && Math.abs(geom(downB)) > 1e-12 ? geom(downP) / geom(downB) : null;
  return { upside, downside };
}

/** §2.9 Omega at threshold τ (default 0). */
export function omegaRatio(p: number[], tau = 0) {
  const gains = p.reduce((s, r) => s + Math.max(0, r - tau), 0);
  const losses = p.reduce((s, r) => s + Math.max(0, tau - r), 0);
  if (losses < 1e-12) return null;
  return gains / losses;
}

/** §2.10 Kappa_3 */
export function kappa3(p: number[], tau = 0) {
  const lpm = mean(p.map((r) => Math.max(0, tau - r) ** 3));
  const denom = Math.cbrt(lpm);
  if (denom < 1e-12) return null;
  return (mean(p) - tau) / denom;
}

/** §2.11 M² */
export function modiglianiM2(sharpeAnn: number, sigmaBenchAnn: number, rfAnnual: number) {
  return rfAnnual + sharpeAnn * sigmaBenchAnn;
}

export function computeSpecMetrics(input: SpecInputs): SpecMetrics {
  const { nav, portfolioReturns: p, benchmarkReturns: b, riskFreeAnnual: rf, navInr } = input;
  const navValues = nav.map((x) => x.value);
  const P0 = navValues[0]!;
  const PT = navValues[navValues.length - 1]!;
  const date0 = nav[0]!.date;
  const dateT = nav[nav.length - 1]!.date;

  const abs = absoluteReturn(P0, PT);
  const { cagr, shortPeriod } = cagrFromDates(P0, PT, date0, dateT);
  const twr = timeWeightedReturn(p);
  const benchTotal = b.length ? b.reduce((acc, r) => acc * (1 + r), 1) - 1 : 0;
  const activeArith = abs - benchTotal;
  const activeGeom = (1 + abs) / (1 + benchTotal) - 1;

  let irr: number | null = null;
  if (input.tradeFlows?.length) {
    const terminalDays = (new Date(dateT).getTime() - new Date(date0).getTime()) / (24 * 3600 * 1000);
    irr = moneyWeightedIrr(input.tradeFlows, PT, terminalDays);
  }

  const roll = rollingReturnAnnualized(p, 21);
  const betaVal = beta(p, b);
  const { alphaDaily } = jensenAlphaOLS(p, b, rf);
  const jensenAnn = alphaDaily * TRADING_DAYS_PER_YEAR;
  const sharpe = sharpeRatioAnn(p, rf);
  const sortino = sortinoRatioAnn(p, rf);
  const treynorNeg = betaVal != null && betaVal <= 0;
  const treynor =
    betaVal != null && Math.abs(betaVal) > 1e-12 ? ((mean(p) - rf / TRADING_DAYS_PER_YEAR) * TRADING_DAYS_PER_YEAR) / betaVal : null;
  const ir = informationRatioAnn(p, b);
  const vol = stdevSample(p) * Math.sqrt(TRADING_DAYS_PER_YEAR);
  const benchVol = stdevSample(b) * Math.sqrt(TRADING_DAYS_PER_YEAR);
  const excess = p.map((r, i) => r - (b[i] ?? 0));
  const te = stdevSample(excess) * Math.sqrt(TRADING_DAYS_PER_YEAR);
  const mar = rf / TRADING_DAYS_PER_YEAR;
  const downsideDev =
    Math.sqrt(mean(p.map((r) => Math.min(0, r - mar) ** 2))) * Math.sqrt(TRADING_DAYS_PER_YEAR);

  const dd = drawdownMetrics(navValues);
  const calmar = dd.maxDrawdown !== 0 && cagr != null && !Number.isNaN(cagr) ? cagr / Math.abs(dd.maxDrawdown) : null;

  const episodeTroughs = [...dd.drawdowns].filter((d) => d < 0).sort((a, b2) => a - b2).slice(0, 3);
  const avgWorst =
    episodeTroughs.length ? Math.abs(mean(episodeTroughs)) : Math.abs(dd.maxDrawdown) || 1e-6;
  const sterling = cagr != null && !Number.isNaN(cagr) ? cagr / avgWorst : null;

  const burkeDenom = Math.sqrt(mean(dd.drawdowns.map((d) => (d < 0 ? d * d : 0)))) || 1e-6;
  const burke = ((mean(p) - mar) * TRADING_DAYS_PER_YEAR) / burkeDenom;

  const omega = omegaRatio(p, 0);
  const k3 = kappa3(p, mar);
  const sharpeForM2 = sharpe ?? 0;
  const m2 = modiglianiM2(sharpeForM2, benchVol, rf);

  const residuals = p.map((r, i) => r - (mar + (betaVal ?? 0) * ((b[i] ?? 0) - mar)));
  const sigmaEps = stdevSample(residuals);
  const appraisal = sigmaEps > 1e-12 ? jensenAnn / (sigmaEps * Math.sqrt(TRADING_DAYS_PER_YEAR)) : null;

  const { upside, downside } = captureRatios(p, b);
  const batting = p.length ? p.filter((r, i) => r > (b[i] ?? 0)).length / p.length : null;

  const recoveryFactor = dd.maxDrawdown !== 0 ? abs / Math.abs(dd.maxDrawdown) : null;

  return {
    absoluteReturn: abs,
    cagr: shortPeriod ? null : cagr,
    cagrFlagShortPeriod: shortPeriod,
    twr,
    mwrIrr: irr,
    rollingReturnAnn: roll,
    activeReturnArithmetic: activeArith,
    activeReturnGeometric: activeGeom,
    benchmarkReturn: benchTotal,
    sharpeAnn: sharpe,
    treynorAnn: treynor,
    treynorNegativeBeta: treynorNeg,
    sortinoAnn: sortino,
    jensensAlphaAnn: jensenAnn,
    informationRatioAnn: ir,
    calmar,
    sterling,
    burke,
    omega,
    kappa3: k3,
    m2,
    appraisal,
    beta: betaVal,
    alphaCapmAnn: jensenAnn,
    volatilityAnn: vol,
    var95Historical: historicalVar(p, 0.05) * navInr,
    cvar95Historical: historicalCvar(p, 0.05) * navInr,
    trackingErrorAnn: te,
    downsideDeviationAnn: downsideDev,
    maxDrawdown: dd.maxDrawdown,
    avgDrawdown: dd.avgDrawdown,
    drawdownDurationDays: dd.drawdownDurationDays,
    recoveryPeriodDays: dd.recoveryPeriodDays,
    recoveryUnrecovered: dd.recoveryUnrecovered,
    recoveryFactor,
    upsideCapture: upside,
    downsideCapture: downside,
    battingAverage: batting,
  };
}
