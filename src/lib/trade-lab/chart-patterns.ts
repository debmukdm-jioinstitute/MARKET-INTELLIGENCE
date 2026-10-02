import type { Bar } from "@/lib/scanner/types";
import { atr } from "./indicators";
import type { LevelZone, PatternHit } from "./types";

/**
 * Rule-based chart-pattern detection on swing pivots. Thresholds are stated in each hit's `rule`.
 * No model, no inference — a pivot is a bar whose high/low is the extreme of ±`order` neighbours.
 */

interface Pivot {
  i: number;
  price: number;
  type: "H" | "L";
}

const f = (n: number) => n.toFixed(2);

export function findPivots(bars: Bar[], order = 4): Pivot[] {
  const out: Pivot[] = [];
  for (let i = order; i < bars.length - order; i++) {
    let isH = true;
    let isL = true;
    for (let j = i - order; j <= i + order; j++) {
      if (j === i) continue;
      if (bars[j].h >= bars[i].h) isH = false;
      if (bars[j].l <= bars[i].l) isL = false;
    }
    if (isH) out.push({ i, price: bars[i].h, type: "H" });
    if (isL) out.push({ i, price: bars[i].l, type: "L" });
  }
  return out.sort((a, b) => a.i - b.i);
}

/** Support/resistance zones: pivot prices clustered within `tol` (fraction), ≥2 touches, nearest to price first. */
export function supportResistance(bars: Bar[], pivots: Pivot[], tol = 0.006): LevelZone[] {
  const last = bars[bars.length - 1].c;
  const zones: { price: number; touches: number }[] = [];
  for (const p of pivots) {
    const z = zones.find((x) => Math.abs(x.price - p.price) / x.price <= tol);
    if (z) {
      z.price = (z.price * z.touches + p.price) / (z.touches + 1);
      z.touches++;
    } else zones.push({ price: p.price, touches: 1 });
  }
  return zones
    .filter((z) => z.touches >= 2)
    .map((z) => ({ kind: (z.price >= last ? "resistance" : "support") as LevelZone["kind"], price: z.price, touches: z.touches }))
    .sort((a, b) => Math.abs(a.price - last) - Math.abs(b.price - last))
    .slice(0, 6);
}

function slope(pts: { x: number; y: number }[]) {
  const n = pts.length;
  const mx = pts.reduce((s, p) => s + p.x, 0) / n;
  const my = pts.reduce((s, p) => s + p.y, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of pts) {
    num += (p.x - mx) * (p.y - my);
    den += (p.x - mx) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

export function detectChartPatterns(bars: Bar[]): { hits: PatternHit[]; levels: LevelZone[] } {
  const hits: PatternHit[] = [];
  if (bars.length < 40) return { hits, levels: [] };
  const last = bars.length - 1;
  const a = atr(bars, 14);
  const lastAtr = a[last];
  const pivots = findPivots(bars, 4);
  const levels = supportResistance(bars, pivots);
  const highs = pivots.filter((p) => p.type === "H");
  const lows = pivots.filter((p) => p.type === "L");
  const recent = (p: Pivot, maxAgo: number) => last - p.i <= maxAgo;
  const push = (h: Omit<PatternHit, "kind" | "barsAgo" | "time"> & { atBar?: number }) => {
    const at = h.atBar ?? last;
    const { atBar: _a, ...rest } = h;
    hits.push({ ...rest, kind: "chart", barsAgo: last - at, time: bars[at].t });
  };

  // ── Double top / double bottom: last two same-type pivots within 1.5% and ≥10 bars apart, valley/peak ≥ 3% (or 1.5 ATR) between
  if (highs.length >= 2) {
    const [p1, p2] = highs.slice(-2);
    const valley = Math.min(...bars.slice(p1.i, p2.i + 1).map((b) => b.l));
    const diff = Math.abs(p1.price - p2.price) / p1.price;
    const depth = (Math.min(p1.price, p2.price) - valley) / Math.min(p1.price, p2.price);
    if (diff <= 0.015 && p2.i - p1.i >= 10 && depth >= 0.03 && recent(p2, 25)) {
      const broke = bars[last].c < valley;
      push({
        id: "double-top", name: "Double top", bias: "bearish",
        rule: "Two swing highs within 1.5% of each other, ≥10 bars apart, with a ≥3% pullback between; confirmed when price closes below the middle trough.",
        numbers: [`tops ${f(p1.price)} / ${f(p2.price)}`, `neckline ${f(valley)}`, broke ? "neckline broken" : "neckline intact"],
        why: broke ? "Price failed twice at the same ceiling and has now broken the trough — classic reversal confirmation." : "Price failed twice at the same ceiling; a close below the neckline would confirm.",
        confidence: broke ? "high" : "medium",
      });
    }
  }
  if (lows.length >= 2) {
    const [p1, p2] = lows.slice(-2);
    const peak = Math.max(...bars.slice(p1.i, p2.i + 1).map((b) => b.h));
    const diff = Math.abs(p1.price - p2.price) / p1.price;
    const depth = (peak - Math.max(p1.price, p2.price)) / peak;
    if (diff <= 0.015 && p2.i - p1.i >= 10 && depth >= 0.03 && recent(p2, 25)) {
      const broke = bars[last].c > peak;
      push({
        id: "double-bottom", name: "Double bottom", bias: "bullish",
        rule: "Two swing lows within 1.5% of each other, ≥10 bars apart, with a ≥3% rally between; confirmed when price closes above the middle peak.",
        numbers: [`bottoms ${f(p1.price)} / ${f(p2.price)}`, `neckline ${f(peak)}`, broke ? "neckline broken" : "neckline intact"],
        why: broke ? "Price held the same floor twice and has now cleared the peak between — reversal confirmed." : "Price held the same floor twice; a close above the neckline would confirm.",
        confidence: broke ? "high" : "medium",
      });
    }
  }

  // ── Head & shoulders (top): last three swing highs, middle highest by ≥2%, shoulders within 5% of each other
  if (highs.length >= 3) {
    const [l, h, r] = highs.slice(-3);
    const shouldersDiff = Math.abs(l.price - r.price) / Math.max(l.price, r.price);
    if (h.price > l.price * 1.02 && h.price > r.price * 1.02 && shouldersDiff <= 0.05 && recent(r, 20)) {
      const t1 = Math.min(...bars.slice(l.i, h.i + 1).map((b) => b.l));
      const t2 = Math.min(...bars.slice(h.i, r.i + 1).map((b) => b.l));
      const neck = (t1 + t2) / 2;
      const broke = bars[last].c < Math.min(t1, t2);
      push({
        id: "head-shoulders", name: "Head and shoulders", bias: "bearish",
        rule: "Three swing highs: middle ≥2% above both shoulders, shoulders within 5% of each other; confirmed on a close below the lower trough.",
        numbers: [`shoulders ${f(l.price)} / ${f(r.price)}`, `head ${f(h.price)}`, `neckline ~${f(neck)}`, broke ? "neckline broken" : "neckline intact"],
        why: broke ? "Lower-high structure after a peak, now with a neckline break — a major top signal." : "A peak flanked by lower shoulders; weakness confirms only on a neckline break.",
        confidence: broke ? "high" : "medium",
      });
    }
  }
  if (lows.length >= 3) {
    const [l, h, r] = lows.slice(-3);
    const shouldersDiff = Math.abs(l.price - r.price) / Math.max(l.price, r.price);
    if (h.price < l.price * 0.98 && h.price < r.price * 0.98 && shouldersDiff <= 0.05 && recent(r, 20)) {
      const p1 = Math.max(...bars.slice(l.i, h.i + 1).map((b) => b.h));
      const p2 = Math.max(...bars.slice(h.i, r.i + 1).map((b) => b.h));
      const neck = (p1 + p2) / 2;
      const broke = bars[last].c > Math.max(p1, p2);
      push({
        id: "inverse-head-shoulders", name: "Inverse head and shoulders", bias: "bullish",
        rule: "Three swing lows: middle ≥2% below both shoulders, shoulders within 5% of each other; confirmed on a close above the higher peak.",
        numbers: [`shoulders ${f(l.price)} / ${f(r.price)}`, `head ${f(h.price)}`, `neckline ~${f(neck)}`, broke ? "neckline broken" : "neckline intact"],
        why: broke ? "Higher-low structure after a trough, now with a neckline break — a major bottom signal." : "A trough flanked by higher shoulders; strength confirms only on a neckline break.",
        confidence: broke ? "high" : "medium",
      });
    }
  }

  // ── Triangles: regress the last 3–4 swing highs and lows (needs ≥3 of each within last 60 bars)
  const hi = highs.filter((p) => last - p.i <= 60).slice(-4);
  const lo = lows.filter((p) => last - p.i <= 60).slice(-4);
  if (hi.length >= 3 && lo.length >= 3 && Number.isFinite(lastAtr)) {
    const sh = slope(hi.map((p) => ({ x: p.i, y: p.price })));
    const sl = slope(lo.map((p) => ({ x: p.i, y: p.price })));
    const flatT = lastAtr / 50; // |slope| below this per bar = flat
    const trendT = lastAtr / 25; // slope beyond this per bar = clearly rising/falling
    const flatH = Math.abs(sh) < flatT;
    const flatL = Math.abs(sl) < flatT;
    const upL = sl >= trendT;
    const dnH = sh <= -trendT;
    const mkTri = (id: string, name: string, bias: PatternHit["bias"], rule: string, why: string) =>
      push({ id, name, bias, rule, numbers: [`upper slope ${f(sh)}/bar`, `lower slope ${f(sl)}/bar`, `${hi.length} highs, ${lo.length} lows`], why, confidence: "low" });
    if (flatH && upL) mkTri("ascending-triangle", "Ascending triangle", "bullish", "Flat resistance (swing-high slope ≈ 0) with rising swing lows over the last 60 bars.", "Buyers keep stepping in at higher prices against a fixed ceiling — upside break is the usual resolution.");
    else if (flatL && dnH) mkTri("descending-triangle", "Descending triangle", "bearish", "Flat support (swing-low slope ≈ 0) with falling swing highs over the last 60 bars.", "Sellers keep pressing from lower highs against a fixed floor — downside break is the usual resolution.");
    else if (dnH && upL) mkTri("symmetric-triangle", "Symmetric triangle", "neutral", "Falling swing highs and rising swing lows over the last 60 bars (converging).", "Range is compressing; direction is decided by the break.");
  }

  // ── Breakout / breakdown with volume confirmation
  const win = bars.slice(Math.max(0, last - 20), last); // prior 20 bars, excluding current
  if (win.length >= 15) {
    const hh = Math.max(...win.map((b) => b.h));
    const ll = Math.min(...win.map((b) => b.l));
    const avgV = win.reduce((s, b) => s + b.v, 0) / win.length;
    const vr = avgV > 0 ? bars[last].v / avgV : NaN;
    const c = bars[last].c;
    if (c > hh) {
      const conf = Number.isFinite(vr) && vr >= 1.5;
      push({
        id: "breakout", name: conf ? "Breakout (volume confirmed)" : "Breakout (volume unconfirmed)", bias: "bullish",
        rule: "Close above the highest high of the prior 20 bars; confirmed when volume ≥ 1.5× the 20-bar average.",
        numbers: [`close ${f(c)}`, `20-bar high ${f(hh)}`, Number.isFinite(vr) ? `volume ${vr.toFixed(1)}× avg` : "volume n/a"],
        why: conf ? "Price cleared resistance on heavy participation — breakouts with volume hold more often." : "Price cleared resistance but on ordinary volume — treat as lower conviction.",
        confidence: conf ? "high" : "low",
      });
    } else if (c < ll) {
      const conf = Number.isFinite(vr) && vr >= 1.5;
      push({
        id: "breakdown", name: conf ? "Breakdown (volume confirmed)" : "Breakdown (volume unconfirmed)", bias: "bearish",
        rule: "Close below the lowest low of the prior 20 bars; confirmed when volume ≥ 1.5× the 20-bar average.",
        numbers: [`close ${f(c)}`, `20-bar low ${f(ll)}`, Number.isFinite(vr) ? `volume ${vr.toFixed(1)}× avg` : "volume n/a"],
        why: conf ? "Price lost support on heavy participation — selling pressure is real." : "Price lost support on ordinary volume — lower conviction.",
        confidence: conf ? "high" : "low",
      });
    }
  }

  return { hits, levels };
}
