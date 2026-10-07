#!/usr/bin/env node
/**
 * Builds src/lib/guide/industry-map.json: NSE symbol -> [Yahoo industry, Yahoo sector] for every NSE
 * equity outside the Nifty 500 (which already carries NSE industries). Resumable and polite (about one
 * request per 1.5s, backs off on 429). Re-run monthly or after big listing waves:
 *   node scripts/build-industry-map.mjs
 */
import { gunzipSync } from "node:zlib";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const OUT = new URL("../src/lib/guide/industry-map.json", import.meta.url);
const UA = "Mozilla/5.0"; // Yahoo 429s full browser user agents on this endpoint; the bare token is accepted
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const master = JSON.parse(gunzipSync(Buffer.from(await (await fetch("https://assets.upstox.com/market-quote/instruments/exchange/NSE.json.gz")).arrayBuffer())).toString("utf8"));
const universe = master.filter((r) => r.segment === "NSE_EQ" && r.instrument_type === "EQ" && r.trading_symbol).map((r) => ({ symbol: r.trading_symbol, name: r.name ?? r.trading_symbol }));
const n500 = new Set([...readFileSync(new URL("../src/lib/prowess/nifty500.ts", import.meta.url), "utf8").matchAll(/\["([^"]+)", "[^"]+", "[^"]+"\]/g)].map((m) => m[1]));
const skip = /\b(ETF|BEES|AMC)\b|NIFTY|SENSEX|GOLD|SILVER|LIQUID|GILT|BOND/i;
const todo = universe.filter((u) => !n500.has(u.symbol) && !skip.test(u.name));

const map = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
let done = 0;
let misses = 0;
for (const u of todo) {
  if (u.symbol in map) continue;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(u.symbol)}&quotesCount=6&newsCount=0`, { headers: { "User-Agent": UA } }).catch(() => null);
    if (res?.status === 429) { await sleep(60_000 * (attempt + 1)); continue; }
    if (res?.ok) {
      const q = ((await res.json()).quotes ?? []).find((x) => x.quoteType === "EQUITY" && [`${u.symbol}.NS`, `${u.symbol}.BO`].includes(String(x.symbol).toUpperCase()));
      map[u.symbol] = q && (q.industry || q.sector) ? [q.industry ?? "", q.sector ?? ""] : null;
      if (!map[u.symbol]) misses++;
    }
    break;
  }
  if (++done % 50 === 0) { writeFileSync(OUT, JSON.stringify(map)); console.log(`${done}/${todo.length} (misses ${misses})`); }
  await sleep(1500);
}
writeFileSync(OUT, JSON.stringify(map));
console.log(`done: ${Object.keys(map).length} symbols, ${misses} without industry`);
