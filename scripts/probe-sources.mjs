#!/usr/bin/env node
// Probes every source in .claude/skills/web-scraper/sources.json and reports reachability.
// Usage: node scripts/probe-sources.mjs [--json]
import { readFileSync } from "node:fs";

const reg = JSON.parse(readFileSync(new URL("../.claude/skills/web-scraper/sources.json", import.meta.url), "utf8"));
const UA = "Mozilla/5.0 (compatible; MarketIntelligenceBot/1.0; contact: debmuk.dm@gmail.com)";

async function probe(s) {
  const t0 = Date.now();
  try {
    const res = await fetch(s.url, { headers: { "User-Agent": UA, Accept: "*/*" }, signal: AbortSignal.timeout(15000), redirect: "follow" });
    const body = await res.text();
    return { id: s.id, tier: s.tier, wired: s.wired, http: res.status, bytes: body.length, ms: Date.now() - t0, ok: res.ok && body.length > 20 };
  } catch (e) {
    return { id: s.id, tier: s.tier, wired: s.wired, http: 0, ms: Date.now() - t0, ok: false, err: String(e.cause?.code ?? e.message) };
  }
}

const results = await Promise.all(reg.sources.map(probe));
if (process.argv.includes("--json")) console.log(JSON.stringify(results, null, 2));
else for (const r of results) console.log(`${r.ok ? "OK  " : "FAIL"} ${String(r.http).padEnd(3)} ${String(r.ms).padStart(5)}ms  ${r.id.padEnd(22)} ${r.tier.padEnd(6)} wired=${r.wired} ${r.err ?? ""}`);
