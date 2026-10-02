/**
 * Walk-forward validation of Trade Lab pattern rules on real daily history.
 * For each pattern the first bar it fires (after ≥10 quiet bars) is an event; we record the forward
 * 5- and 10-bar close-to-close return and compare to the unconditional base rate on the same sample.
 * Output: src/lib/trade-lab/pattern-stats.json (shown on pattern cards). Run:
 *   npx vite-node -c vitest.config.ts scripts/validate-trade-patterns.ts
 */
import { writeFileSync } from "node:fs";
import { detectCandlesticks } from "../src/lib/trade-lab/candlesticks";
import { detectChartPatterns } from "../src/lib/trade-lab/chart-patterns";
import { fetchYahooBars } from "../src/lib/trade-lab/data";

const SYMBOLS = ["RELIANCE","TCS","HDFCBANK","ICICIBANK","INFY","SBIN","BHARTIARTL","ITC","LT","AXISBANK","KOTAKBANK","HINDUNILVR","MARUTI","SUNPHARMA","TATAMOTORS","TATASTEEL","BAJFINANCE","ASIANPAINT","TITAN","ULTRACEMCO","NTPC","POWERGRID","ONGC","COALINDIA","JSWSTEEL","HCLTECH","WIPRO","M&M","ADANIPORTS","DRREDDY","CIPLA","GRASIM","HINDALCO","BPCL","EICHERMOT","HEROMOTOCO","DIVISLAB","BRITANNIA","INDUSINDBK","TECHM"];
const WINDOW = 250;
const GAP = 10;

type Acc = { n: number; up5: number; up10: number; sum5: number; sum10: number; bias: string; name: string };
const acc = new Map<string, Acc>();
let baseN = 0, baseUp5 = 0, baseUp10 = 0;
let symbolsUsed = 0, firstT = Infinity, lastT = 0, barsTotal = 0;

for (const sym of SYMBOLS) {
  const res = await fetchYahooBars(`${sym}.NS`, "1d", "10y");
  if (!res || res.bars.length < 400) { console.log("skip", sym); continue; }
  symbolsUsed++;
  const bars = res.bars;
  firstT = Math.min(firstT, bars[0].t); lastT = Math.max(lastT, bars[bars.length - 1].t); barsTotal += bars.length;
  const lastSeen = new Map<string, number>();
  for (let i = 60; i < bars.length - 10; i++) {
    const win = bars.slice(Math.max(0, i + 1 - WINDOW), i + 1);
    const c5 = bars[i + 5].c / bars[i].c - 1;
    const c10 = bars[i + 10].c / bars[i].c - 1;
    baseN++; if (c5 > 0) baseUp5++; if (c10 > 0) baseUp10++;
    const hits = [...detectChartPatterns(win).hits, ...detectCandlesticks(win, 1)].filter((h) => h.barsAgo === 0);
    for (const h of hits) {
      const key = h.id.startsWith("breakout") || h.id.startsWith("breakdown") ? h.id : h.id;
      const prev = lastSeen.get(key) ?? -999;
      lastSeen.set(key, i);
      if (i - prev < GAP) continue; // same event still firing
      const a = acc.get(key) ?? { n: 0, up5: 0, up10: 0, sum5: 0, sum10: 0, bias: h.bias, name: h.name.replace(/ \(.*\)$/, "") };
      a.n++; a.sum5 += c5; a.sum10 += c10; if (c5 > 0) a.up5++; if (c10 > 0) a.up10++;
      acc.set(key, a);
    }
  }
  console.log("done", sym, bars.length);
}

const base = { n: baseN, up5: baseUp5 / baseN, up10: baseUp10 / baseN };
const patterns: Record<string, unknown> = {};
for (const [id, a] of acc) {
  const dirHit = (up: number) => (a.bias === "bearish" ? 1 - up / a.n : a.bias === "bullish" ? up / a.n : null);
  patterns[id] = {
    name: a.name, bias: a.bias, events: a.n,
    avgFwd5Pct: +((a.sum5 / a.n) * 100).toFixed(2), avgFwd10Pct: +((a.sum10 / a.n) * 100).toFixed(2),
    directionalHit5: dirHit(a.up5) === null ? null : +(dirHit(a.up5)! * 100).toFixed(1),
    directionalHit10: dirHit(a.up10) === null ? null : +(dirHit(a.up10)! * 100).toFixed(1),
  };
}
const out = {
  generatedAt: new Date().toISOString(),
  sample: { symbols: symbolsUsed, bars: barsTotal, from: new Date(firstT * 1000).toISOString().slice(0, 10), to: new Date(lastT * 1000).toISOString().slice(0, 10), timeframe: "1d" },
  baseRate: { upAfter5Pct: +(base.up5 * 100).toFixed(1), upAfter10Pct: +(base.up10 * 100).toFixed(1), bars: baseN },
  patterns,
  note: "First firing of each pattern after ≥10 quiet bars, per stock. Forward return is close→close, no costs. Descriptive history, not a forecast.",
};
writeFileSync("src/lib/trade-lab/pattern-stats.json", JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
