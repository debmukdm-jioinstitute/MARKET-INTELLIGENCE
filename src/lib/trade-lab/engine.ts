import type { Bar } from "@/lib/scanner/types";
import { readLab, ttlSeconds, writeLab } from "./cache";
import stats from "./pattern-stats.json";
import { detectCandlesticks } from "./candlesticks";
import { detectChartPatterns } from "./chart-patterns";
import { resolveInstrument, fetchBars } from "./data";
import {
  adx, aroon, atr, bollinger, cci, emaStd, ichimoku, macd, mfi, obv, psar, rsi, sessionVwap, sma, stochastic, supertrend,
} from "./indicators";
import { TIMEFRAMES, type Bias, type IndicatorReading, type LabResult, type Reason, type Timeframe } from "./types";

const fin = Number.isFinite;
const f2 = (n: number) => (fin(n) ? n.toFixed(2) : "—");
const SPARK_LEN = 40;
const spark = (xs: number[]) => xs.slice(-SPARK_LEN).map((v) => (fin(v) ? Number(v.toFixed(4)) : null));
const lastOf = (xs: number[]) => xs[xs.length - 1];

function crossedRecently(a: number[], b: number[], within = 3): "up" | "down" | null {
  const n = a.length;
  for (let k = 0; k < within; k++) {
    const i = n - 1 - k;
    if (i < 1) break;
    if (![a[i], b[i], a[i - 1], b[i - 1]].every(fin)) continue;
    if (a[i - 1] <= b[i - 1] && a[i] > b[i]) return "up";
    if (a[i - 1] >= b[i - 1] && a[i] < b[i]) return "down";
  }
  return null;
}

/** Computes every indicator reading for the latest bar. Pure deterministic math on `bars`. */
export function buildReadings(bars: Bar[], intraday: boolean, hasVolume: boolean): IndicatorReading[] {
  const close = bars.map((b) => b.c);
  const last = close[close.length - 1];
  const out: IndicatorReading[] = [];
  const add = (r: IndicatorReading) => out.push(r);

  // RSI
  const r = rsi(close, 14);
  const rv = lastOf(r);
  if (fin(rv)) {
    const [bias, reading]: [Bias, string] =
      rv > 70 ? ["bearish", "Overbought — momentum is stretched; pullbacks get more likely."]
      : rv >= 55 ? ["bullish", "Buyers are in control; momentum is healthy but not yet stretched."]
      : rv >= 45 ? ["neutral", "Mid-range — no momentum edge either way."]
      : rv >= 30 ? ["bearish", "Sellers are in control; momentum is weak."]
      : ["bullish", "Oversold — selling looks exhausted; bounces get more likely."];
    add({ id: "rsi", label: "RSI (14)", value: f2(rv), detail: [], bias, reading, rule: ">70 overbought (bearish) · 55–70 bullish · 45–55 neutral · 30–45 bearish · <30 oversold (bullish)", spark: spark(r) });
  }

  // MACD
  const m = macd(close, 12, 26, 9);
  const ml = lastOf(m.line), ms = lastOf(m.signal), mh = lastOf(m.hist);
  if (fin(ml) && fin(ms)) {
    const cross = crossedRecently(m.line, m.signal, 3);
    const bias: Bias = ml > ms ? "bullish" : "bearish";
    const reading = cross === "up" ? "MACD line just crossed above its signal line — fresh bullish momentum."
      : cross === "down" ? "MACD line just crossed below its signal line — fresh bearish momentum."
      : ml > ms ? "MACD line is above its signal line — momentum is up." : "MACD line is below its signal line — momentum is down.";
    add({ id: "macd", label: "MACD (12,26,9)", value: f2(ml), detail: [`signal ${f2(ms)}`, `histogram ${f2(mh)}`], bias, reading, rule: "MACD line > signal line = bullish, otherwise bearish", spark: spark(m.hist) });
  }

  // Moving averages
  const mkMA = (id: string, label: string, fn: (xs: number[], n: number) => number[]) => {
    const periods = [20, 50, 200];
    const vals = periods.map((p) => lastOf(fn(close, p)));
    const known = vals.filter(fin);
    if (!known.length) return;
    const above = known.filter((v) => last > v).length;
    const bias: Bias = above === known.length ? "bullish" : above === 0 ? "bearish" : "neutral";
    const reading = above === known.length ? "Price is above every available average — trend is up across horizons."
      : above === 0 ? "Price is below every available average — trend is down across horizons."
      : `Price is above ${above} of ${known.length} averages — trend is mixed.`;
    const mid = fn(close, 20);
    add({ id, label, value: periods.map((p, i) => `${p}: ${f2(vals[i])}`).join(" · "), detail: [], bias, reading, rule: "Price above all available averages = bullish, below all = bearish, else neutral", spark: spark(mid) });
  };
  mkMA("ema", "EMA 20 / 50 / 200", emaStd);
  mkMA("sma", "SMA 20 / 50 / 200", sma);

  // Bollinger
  const bb = bollinger(close, 20, 2);
  const pb = lastOf(bb.pctB);
  if (fin(pb)) {
    const [bias, reading]: [Bias, string] =
      pb > 1 ? ["bearish", "Closed above the upper band — stretched; mean-reversion risk."]
      : pb >= 0.5 ? ["bullish", "Trading in the upper half of the bands — buyers have the edge."]
      : pb >= 0 ? ["bearish", "Trading in the lower half of the bands — sellers have the edge."]
      : ["bullish", "Closed below the lower band — stretched; bounce potential."];
    add({ id: "bb", label: "Bollinger Bands (20,2)", value: `%B ${pb.toFixed(2)}`, detail: [`upper ${f2(lastOf(bb.upper))}`, `mid ${f2(lastOf(bb.mid))}`, `lower ${f2(lastOf(bb.lower))}`, `bandwidth ${(lastOf(bb.bandwidth) * 100).toFixed(1)}%`], bias, reading, rule: "%B >1 bearish (stretched) · 0.5–1 bullish · 0–0.5 bearish · <0 bullish (oversold)", spark: spark(bb.pctB) });
  }

  // Stochastic
  const st = stochastic(bars, 14, 3, 3);
  const sk = lastOf(st.k), sd = lastOf(st.d);
  if (fin(sk) && fin(sd)) {
    const [bias, reading]: [Bias, string] =
      sk > 80 ? ["bearish", "Overbought zone — closes are pinned near the top of the range."]
      : sk < 20 ? ["bullish", "Oversold zone — closes are pinned near the bottom of the range."]
      : sk > sd ? ["bullish", "%K is above %D — short-term momentum is turning up."]
      : ["bearish", "%K is below %D — short-term momentum is turning down."];
    add({ id: "stoch", label: "Stochastic (14,3,3)", value: `%K ${f2(sk)}`, detail: [`%D ${f2(sd)}`], bias, reading, rule: "%K >80 bearish · <20 bullish · otherwise %K>%D bullish, %K<%D bearish", spark: spark(st.k) });
  }

  // ADX
  const ad = adx(bars, 14);
  const av = lastOf(ad.adx), pdi = lastOf(ad.plusDI), mdi = lastOf(ad.minusDI);
  if (fin(av)) {
    const strong = av >= 25;
    const bias: Bias = av < 20 ? "neutral" : pdi > mdi ? "bullish" : "bearish";
    const reading = av < 20 ? "ADX under 20 — no real trend; range-bound conditions."
      : `${strong ? "Strong" : "Developing"} ${pdi > mdi ? "uptrend" : "downtrend"} (+DI ${pdi > mdi ? "above" : "below"} −DI).`;
    add({ id: "adx", label: "ADX (14)", value: f2(av), detail: [`+DI ${f2(pdi)}`, `−DI ${f2(mdi)}`], bias, reading, rule: "ADX <20 neutral · ≥20: +DI>−DI bullish, else bearish (≥25 = strong)", spark: spark(ad.adx) });
  }

  // Supertrend
  const su = supertrend(bars, 10, 3);
  const sdir = lastOf(su.dir);
  if (fin(sdir)) {
    add({ id: "supertrend", label: "Supertrend (10,3)", value: f2(lastOf(su.line)), detail: [sdir === 1 ? "uptrend" : "downtrend"], bias: sdir === 1 ? "bullish" : "bearish",
      reading: sdir === 1 ? "Price is above the Supertrend line — trend-following trail is long." : "Price is below the Supertrend line — trend-following trail is short.",
      rule: "Close above Supertrend line = bullish, below = bearish", spark: spark(su.line) });
  }

  // ATR (informational)
  const at = atr(bars, 14);
  const av2 = lastOf(at);
  if (fin(av2)) {
    const pct = (av2 / last) * 100;
    add({ id: "atr", label: "ATR (14)", value: f2(av2), detail: [`${pct.toFixed(2)}% of price`], bias: "neutral",
      reading: `Average bar range is ${pct.toFixed(2)}% of price — use it to size stops (e.g. 2× ATR ≈ ${f2(2 * av2)}).`,
      rule: "Informational — measures volatility, carries no direction", spark: spark(at) });
  }

  // Ichimoku
  const ic = ichimoku(bars);
  const ct = lastOf(ic.cloudTop), cb = lastOf(ic.cloudBottom);
  if (fin(ct) && fin(cb)) {
    const bias: Bias = last > ct ? "bullish" : last < cb ? "bearish" : "neutral";
    add({ id: "ichimoku", label: "Ichimoku (9,26,52)", value: `cloud ${f2(cb)}–${f2(ct)}`, detail: [`tenkan ${f2(lastOf(ic.tenkan))}`, `kijun ${f2(lastOf(ic.kijun))}`], bias,
      reading: bias === "bullish" ? "Price is above the cloud — bullish structure." : bias === "bearish" ? "Price is below the cloud — bearish structure." : "Price is inside the cloud — no clear trend.",
      rule: "Above cloud bullish · below cloud bearish · inside neutral", spark: spark(ic.tenkan) });
  }

  // Parabolic SAR
  const ps = psar(bars);
  const pbull = lastOf(ps.bull);
  if (fin(pbull)) {
    add({ id: "psar", label: "Parabolic SAR", value: f2(lastOf(ps.sar)), detail: [], bias: pbull === 1 ? "bullish" : "bearish",
      reading: pbull === 1 ? "SAR dots are below price — uptrend intact." : "SAR dots are above price — downtrend intact.",
      rule: "SAR below price = bullish, above = bearish", spark: spark(ps.sar) });
  }

  // CCI
  const cc = cci(bars, 20);
  const cv = lastOf(cc);
  if (fin(cv)) {
    const bias: Bias = cv > 100 ? "bullish" : cv < -100 ? "bearish" : "neutral";
    add({ id: "cci", label: "CCI (20)", value: f2(cv), detail: [], bias,
      reading: cv > 100 ? "Above +100 — strong upward momentum." : cv < -100 ? "Below −100 — strong downward momentum." : "Between ±100 — ordinary momentum.",
      rule: "CCI >100 bullish · <−100 bearish · otherwise neutral", spark: spark(cc) });
  }

  // Aroon
  const ar = aroon(bars, 14);
  const au = lastOf(ar.up), adn = lastOf(ar.down);
  if (fin(au) && fin(adn)) {
    const bias: Bias = au > adn && au > 50 ? "bullish" : adn > au && adn > 50 ? "bearish" : "neutral";
    add({ id: "aroon", label: "Aroon (14)", value: `up ${f2(au)}`, detail: [`down ${f2(adn)}`], bias,
      reading: bias === "bullish" ? "New highs are more recent than new lows — uptrend." : bias === "bearish" ? "New lows are more recent than new highs — downtrend." : "Highs and lows are about equally recent — no trend.",
      rule: "Aroon-up > down and > 50 bullish · down > up and > 50 bearish · else neutral", spark: spark(ar.up) });
  }

  // Volume-based indicators — need real volume
  if (hasVolume) {
    const mf = mfi(bars, 14);
    const mv = lastOf(mf);
    if (fin(mv)) {
      const [bias, reading]: [Bias, string] =
        mv > 80 ? ["bearish", "Money flow is overbought — heavy buying may be exhausted."]
        : mv < 20 ? ["bullish", "Money flow is oversold — heavy selling may be exhausted."]
        : mv >= 50 ? ["bullish", "Money is flowing in."] : ["bearish", "Money is flowing out."];
      add({ id: "mfi", label: "MFI (14)", value: f2(mv), detail: [], bias, reading, rule: ">80 bearish (overbought) · <20 bullish (oversold) · otherwise ≥50 bullish, <50 bearish", spark: spark(mf) });
    }
    const ob = obv(bars);
    if (ob.length > 21) {
      const now = lastOf(ob), then = ob[ob.length - 21];
      const priceUp = last > close[close.length - 21];
      const obvUp = now > then;
      const bias: Bias = obvUp ? "bullish" : "bearish";
      const reading = obvUp === priceUp ? `OBV ${obvUp ? "rising" : "falling"} with price over 20 bars — volume confirms the move.`
        : `OBV ${obvUp ? "rising" : "falling"} while price went the other way over 20 bars — divergence; the price move lacks volume support.`;
      add({ id: "obv", label: "OBV", value: Math.round(now).toLocaleString("en-IN"), detail: [], bias, reading, rule: "OBV higher than 20 bars ago = bullish, lower = bearish", spark: spark(ob) });
    }
    if (intraday) {
      const vw = sessionVwap(bars);
      const vv = lastOf(vw);
      if (fin(vv)) {
        add({ id: "vwap", label: "VWAP (session)", value: f2(vv), detail: [`price ${f2(last)}`], bias: last > vv ? "bullish" : "bearish",
          reading: last > vv ? "Price is above today's VWAP — buyers are in profit on average today." : "Price is below today's VWAP — sellers are in profit on average today.",
          rule: "Price above session VWAP = bullish, below = bearish (resets each IST day)", spark: spark(vw) });
      }
    }
  }
  return out;
}

const tfMetaIntraday = (tf: Timeframe) => TIMEFRAMES.some((t) => t.id === tf && t.intraday);

export async function computeLab(symbolRaw: string, tf: Timeframe): Promise<LabResult | { error: string; status: number }> {
  const inst = resolveInstrument(symbolRaw);
  if (!inst) return { error: "Invalid symbol", status: 400 };
  const tfMeta = TIMEFRAMES.find((t) => t.id === tf);
  if (!tfMeta) return { error: "Invalid timeframe", status: 400 };

  const data = await fetchBars(inst, tf);
  if (!data) {
    const needsUpstox = inst.id === "BANKEX" && !process.env.UPSTOX_ACCESS_TOKEN;
    return { error: `No market data available for ${inst.label} (${tf}). Tried ${process.env.UPSTOX_ACCESS_TOKEN ? "Upstox, " : ""}Yahoo Finance.${needsUpstox ? " BANKEX history is only available through the Upstox feed." : ""}`, status: 404 };
  }
  const { bars, hasVolume } = data;
  const lastBar = bars[bars.length - 1];
  const dayOf = (t: number) => Math.floor((t + 19_800) / 86_400);
  const firstOfToday = bars.findIndex((b) => dayOf(b.t) === dayOf(lastBar.t));
  // Intraday: change is vs the previous session's close; otherwise vs the previous bar.
  const prev = tfMetaIntraday(tf) ? (firstOfToday > 0 ? bars[firstOfToday - 1] : bars[0]) : bars.length > 1 ? bars[bars.length - 2] : lastBar;

  const indicators = buildReadings(bars, tfMeta.intraday, hasVolume);
  const candle = detectCandlesticks(bars, 5);
  const chart = detectChartPatterns(bars);
  const hist = stats as unknown as { sample: { symbols: number; from: string; to: string }; baseRate: { upAfter10Pct: number }; patterns: Record<string, { events: number; directionalHit10: number | null; avgFwd10Pct: number }> };
  const patterns = [...chart.hits, ...candle].map((p) => {
    const h = hist.patterns[p.id];
    return h && tf === "1d" ? { ...p, history: { events: h.events, hit10: h.directionalHit10, fwd10: h.avgFwd10Pct, base10: hist.baseRate.upAfter10Pct, sample: `${hist.sample.symbols} F&O stocks, ${hist.sample.from.slice(0, 4)}–${hist.sample.to.slice(0, 4)}` } } : p;
  });

  const directional = indicators.filter((i) => i.id !== "atr");
  const bullish = directional.filter((i) => i.bias === "bullish").length;
  const bearish = directional.filter((i) => i.bias === "bearish").length;
  const neutral = directional.length - bullish - bearish;
  const score = directional.length ? (bullish - bearish) / directional.length : 0;
  const vbias: Bias = score >= 0.25 ? "bullish" : score <= -0.25 ? "bearish" : "neutral";
  const label = vbias === "bullish" ? `Bullish — ${bullish} of ${directional.length} indicators agree`
    : vbias === "bearish" ? `Bearish — ${bearish} of ${directional.length} indicators agree`
    : `Mixed — ${bullish} bullish, ${bearish} bearish, ${neutral} neutral`;

  const reasons: Reason[] = [];
  for (const ind of directional) {
    if (ind.bias === "neutral") continue;
    reasons.push({ source: ind.label, text: `${ind.value} — ${ind.reading}`, bias: ind.bias });
  }
  for (const p of patterns) {
    if (p.kind === "candlestick" && p.barsAgo > 1) continue;
    reasons.push({ source: p.name, text: `${p.numbers.join(", ")} — ${p.why}`, bias: p.bias });
  }
  const px = lastBar.c;
  const near = chart.levels.find((l) => Math.abs(l.price - px) / px <= 0.01);
  if (near) reasons.push({ source: near.kind === "support" ? "Support zone" : "Resistance zone", text: `Price is within 1% of a ${near.kind} zone near ${f2(near.price)} (${near.touches} touches).`, bias: "neutral" });

  const day = lastBar.t;
  const sameDay = (t: number) => Math.floor((t + 19_800) / 86_400) === Math.floor((day + 19_800) / 86_400);
  const sessionBars = tfMeta.intraday ? bars.filter((b) => sameDay(b.t)) : [lastBar];

  return {
    symbol: inst.id,
    yahooTicker: inst.yahoo,
    tf,
    source: data.source,
    adjusted: data.source.startsWith("Yahoo") && !tfMeta.intraday,
    asOf: lastBar.t,
    fetchedAt: Date.now(),
    bars: bars.length,
    price: {
      last: lastBar.c,
      prev: prev.c,
      change: lastBar.c - prev.c,
      changePct: prev.c ? ((lastBar.c - prev.c) / prev.c) * 100 : 0,
      dayHigh: Math.max(...sessionBars.map((b) => b.h)),
      dayLow: Math.min(...sessionBars.map((b) => b.l)),
      volume: sessionBars.reduce((s, b) => s + b.v, 0),
    },
    indicators,
    patterns,
    levels: chart.levels,
    verdict: { bullish, bearish, neutral, total: directional.length, label, bias: vbias },
    reasons,
    candles: bars.slice(-120).map((b) => ({ t: b.t, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v })),
  };
}

/** Cache-first read: fresh cache → serve; else compute (and store); if every source fails → last-good cache flagged stale. */
export async function getLab(symbolRaw: string, tf: Timeframe): Promise<LabResult | { error: string; status: number }> {
  const inst = resolveInstrument(symbolRaw);
  if (!inst) return { error: "Invalid symbol", status: 400 };
  const cached = await readLab(inst.id, tf);
  if (cached && cached.ageSec < ttlSeconds(tf)) return { ...cached.data, cacheAgeSec: cached.ageSec };
  const fresh = await computeLab(symbolRaw, tf);
  if (!("error" in fresh)) {
    await writeLab(inst.id, tf, fresh);
    return fresh;
  }
  if (cached && fresh.status === 404) return { ...cached.data, stale: true, cacheAgeSec: cached.ageSec };
  return fresh;
}
