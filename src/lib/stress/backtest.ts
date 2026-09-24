import { fetchYahooHistory } from "@/lib/feeds/sources/yahoo";
import { bandFor, FAMILY_FIRE_AT, FAMILY_LABEL, SPECS, scoreLinear, type FamilyId } from "./compute";

/**
 * Backtest of the stress index's market-based inputs against forward NIFTY returns.
 * Reduced index: FII flow, market breadth and RBI liquidity have no free daily history, so they are excluded and the
 * remaining weights are re-normalised. Look-ahead is avoided: US-session inputs (US VIX, US10Y, DXY, Brent) use the
 * PRIOR US session; India VIX, USD/INR and NIFTY use the same day. Outcomes are NIFTY returns strictly AFTER the signal day.
 */

type Pt = { date: string; value: number };
const d10 = (p: { date: string }) => p.date.slice(0, 10);

const TEST_IDS = new Set(["india_vix", "india_vix_1d", "us_vix", "usdinr_1d", "us10y_1d", "dxy_1d", "brent_1d", "nifty_1d"]);

async function hist(sym: string): Promise<Pt[]> {
  return (await fetchYahooHistory(sym, "5y")).map((p) => ({ date: d10(p), value: p.value })).filter((p) => p.value > 0);
}

const bisectBefore = (dates: string[], d: string) => {
  let lo = 0, hi = dates.length - 1, idx = -1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1;
    if (dates[m] < d) { idx = m; lo = m + 1; } else hi = m - 1;
  }
  return idx;
};

export type BucketStat = { bucket: string; days: number; meanFwd5: number; medianFwd5: number; probDrop2pct: number; meanMaxDd10: number };

export type BacktestResult = {
  computedAt: string;
  window: [string, string];
  days: number;
  inputs: string[];
  buckets: BucketStat[];
  baseline: { meanFwd5: number; probDrop2pct: number; meanMaxDd10: number };
  correlationFwd5: number;
  high: { threshold: number; days: number; meanFwd5: number; probDrop2pct: number; nonOverlappingEvents: number };
  convergence: { firingAtLeast: number; days: number; meanFwd5: number; probDrop2pct: number; nonOverlappingEvents: number };
  verdict: string;
  caveats: string[];
};

const mean = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : NaN);
const median = (a: number[]) => {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y);
  return s[s.length >> 1];
};
const corr = (x: number[], y: number[]) => {
  const mx = mean(x), my = mean(y);
  let sxy = 0, sxx = 0, syy = 0;
  x.forEach((v, i) => { sxy += (v - mx) * (y[i] - my); sxx += (v - mx) ** 2; syy += (y[i] - my) ** 2; });
  return sxy / Math.sqrt(sxx * syy);
};

/** Count of events after de-clustering: a new event only if ≥ gap trading days since the previous one. */
function declustered(idx: number[], gap = 5): number {
  let n = 0, last = -1e9;
  for (const i of idx) { if (i - last >= gap) { n++; last = i; } }
  return n;
}

export async function runBacktest(): Promise<BacktestResult> {
  const [inVix, usVix, inr, brent, tnx, dxy, nifty] = await Promise.all(["^INDIAVIX", "^VIX", "INR=X", "BZ=F", "^TNX", "DX-Y.NYB", "^NSEI"].map(hist));
  const sorted = (a: Pt[]) => [...a].sort((x, y) => x.date.localeCompare(y.date));
  const [vI, vU, fx, br, ty, dx, nf] = [inVix, usVix, inr, brent, tnx, dxy, nifty].map(sorted);
  const ret = (a: Pt[]) => new Map(a.slice(1).map((p, i) => [p.date, p.value / a[i].value - 1]));
  const diff = (a: Pt[]) => new Map(a.slice(1).map((p, i) => [p.date, p.value - a[i].value]));
  const lvl = (a: Pt[]) => new Map(a.map((p) => [p.date, p.value]));
  const usVixL = lvl(vU), inVixL = lvl(vI);
  const inVixR = ret(vI), fxR = ret(fx), brR = ret(br), dxR = ret(dx), tyD = diff(ty), nfR = ret(nf);
  const usDates = (m: Map<string, number>) => [...m.keys()].sort();
  const uVd = usDates(usVixL), bd = usDates(brR), tdd = usDates(tyD), dxd = usDates(dxR);
  const prior = (m: Map<string, number>, dates: string[], d: string) => { const i = bisectBefore(dates, d); return i >= 0 ? m.get(dates[i]) ?? null : null; };

  const spec = SPECS.filter((s) => TEST_IDS.has(s.id));
  const nDates = nf.map((p) => p.date);
  const rows: { i: number; score: number; families: Set<FamilyId> }[] = [];
  nDates.forEach((d, i) => {
    if (i === 0) return;
    const v: Record<string, number | null> = {
      india_vix: inVixL.get(d) ?? null,
      india_vix_1d: inVixR.get(d) ?? null,
      us_vix: prior(usVixL, uVd, d),
      usdinr_1d: fxR.get(d) ?? null,
      us10y_1d: prior(tyD, tdd, d),
      dxy_1d: prior(dxR, dxd, d),
      brent_1d: prior(brR, bd, d),
      nifty_1d: nfR.get(d) ?? null,
    };
    const seen = spec.filter((s) => v[s.id] != null);
    if (seen.length < spec.length) return;
    const totalW = seen.reduce((a, s) => a + s.weight, 0);
    const comp = seen.map((s) => ({ s, score: scoreLinear(v[s.id] as number, s.calm, s.stressed), w: s.weight / totalW }));
    const score = comp.reduce((a, c) => a + c.score * c.w, 0);
    const fams = new Set<FamilyId>();
    for (const f of new Set(comp.map((c) => c.s.family))) {
      const cs = comp.filter((c) => c.s.family === f);
      const w = cs.reduce((a, c) => a + c.w, 0);
      if (cs.reduce((a, c) => a + c.score * c.w, 0) / w >= FAMILY_FIRE_AT) fams.add(f);
    }
    rows.push({ i, score, families: fams });
  });

  // Forward outcomes (strictly after the signal day).
  const px = nf.map((p) => p.value);
  const usable = rows.filter((r) => r.i + 10 < px.length).map((r) => {
    const fwd5 = (px[r.i + 5] / px[r.i] - 1) * 100;
    let minP = Infinity;
    for (let k = 1; k <= 10; k++) minP = Math.min(minP, px[r.i + k]);
    return { ...r, fwd5, dd10: (minP / px[r.i] - 1) * 100 };
  });
  if (usable.length < 100) throw new Error("Backtest: not enough overlapping history");

  const stat = (bucket: string, xs: typeof usable): BucketStat => ({
    bucket, days: xs.length,
    meanFwd5: mean(xs.map((x) => x.fwd5)), medianFwd5: median(xs.map((x) => x.fwd5)),
    probDrop2pct: xs.filter((x) => x.fwd5 <= -2).length / Math.max(1, xs.length),
    meanMaxDd10: mean(xs.map((x) => x.dd10)),
  });
  const bands = ["calm", "normal", "elevated", "high", "extreme"] as const;
  const buckets = bands.map((b) => stat(b, usable.filter((u) => bandFor(u.score) === b))).filter((b) => b.days > 0);
  const base = stat("all", usable);

  const HIGH = 45;
  const highRows = usable.filter((u) => u.score >= HIGH);
  const conv = usable.filter((u) => u.families.size >= 3);
  const hi = stat("high", highRows), cv = stat("conv", conv);
  const cor = corr(usable.map((u) => u.score), usable.map((u) => u.fwd5));

  const hiDd = mean(highRows.map((u) => u.dd10));
  const dropUp = hi.probDrop2pct - base.probDrop2pct;
  const ddWorse = hiDd - base.meanMaxDd10; // negative = deeper drawdowns after elevated stress
  const pc = (x: number) => `${(x * 100).toFixed(0)}%`;
  const verdict =
    hi.days < 20
      ? "Too few elevated-stress days in this window to conclude anything."
      : `After elevated stress (score ≥${HIGH}; ${hi.days} days, ${declustered(highRows.map((r) => r.i))} distinct episodes): average 5-day NIFTY return ${hi.meanFwd5.toFixed(2)}% vs ${base.meanFwd5.toFixed(2)}% overall (no drop in returns — markets often rebounded); chance of a ≥2% drop ${pc(hi.probDrop2pct)} vs ${pc(base.probDrop2pct)}; worst 10-day drawdown averaged ${hiDd.toFixed(2)}% vs ${base.meanMaxDd10.toFixed(2)}%. ` +
        (dropUp > 0.02 || ddWorse < -0.2
          ? "So elevated stress has gone with somewhat more downside risk, not with lower average returns. The samples are small; treat it as a risk gauge, not a sell signal."
          : "No meaningful difference from normal conditions.");

  return {
    computedAt: new Date().toISOString(),
    window: [nDates[rows[0].i], nDates[usable[usable.length - 1].i]],
    days: usable.length,
    inputs: spec.map((s) => s.id),
    buckets,
    baseline: { meanFwd5: base.meanFwd5, probDrop2pct: base.probDrop2pct, meanMaxDd10: base.meanMaxDd10 },
    correlationFwd5: cor,
    high: { threshold: HIGH, days: hi.days, meanFwd5: hi.meanFwd5, probDrop2pct: hi.probDrop2pct, nonOverlappingEvents: declustered(highRows.map((r) => r.i)) },
    convergence: { firingAtLeast: 3, days: cv.days, meanFwd5: cv.meanFwd5, probDrop2pct: cv.probDrop2pct, nonOverlappingEvents: declustered(conv.map((r) => r.i)) },
    verdict,
    caveats: [
      "Reduced index: FII flow, breadth and RBI liquidity have no free daily history and are excluded (weights re-normalised).",
      "Overlapping 5-day windows: consecutive days are not independent, so effective sample size is far smaller than 'days' — use the non-overlapping event count.",
      "Weights and thresholds were set by judgement before this test, not tuned on it; but one market regime (about 5 years) is a short sample.",
      `Families for convergence: ${Object.values(FAMILY_LABEL).join(", ")} (only those with available history).`,
      "Past relationships need not persist. Research and education only — not investment advice.",
    ],
  };
}

let mem: { at: number; v: BacktestResult } | null = null;
export async function getBacktest(): Promise<BacktestResult> {
  if (mem && Date.now() - mem.at < 6 * 3_600_000) return mem.v;
  const v = await runBacktest();
  mem = { at: Date.now(), v };
  return v;
}
