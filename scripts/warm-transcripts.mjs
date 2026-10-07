// Warms the earnings-transcript archive for the whole Indian listed universe by calling the public
// endpoint, which reads each company's official sources and persists the result.
// Usage: node scripts/warm-transcripts.mjs [--site https://...] [--concurrency 3] [--limit N] [--only A,B] [--budget-min 330]
const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > -1 ? process.argv[i + 1] : fallback; };
const SITE = (arg("site", process.env.SITE_URL || "https://getmarketintelligence.in")).replace(/\/$/, "");
const CONCURRENCY = Number(arg("concurrency", 3));
const LIMIT = Number(arg("limit", 0));
const ONLY = arg("only", "");
const DEADLINE = Date.now() + Number(arg("budget-min", 330)) * 60_000;
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/128 Safari/537.36";
// Total Market = Nifty 500 + Microcap 250; the rest add sector/size indices (Sensex names all sit inside Nifty 500).
const LISTS = ["niftytotalmarket_list", "nifty50list", "niftynext50list", "nifty100list", "nifty200list", "nifty500list", "niftylargemidcap250list", "niftymidcap150list", "niftymidcap100list", "niftysmallcap250list", "niftysmallcap100list", "niftymicrocap250_list", "niftybanklist", "niftyfinancialservices25-50list", "niftyitlist", "niftymetallist", "niftyenergylist", "niftyautolist", "niftypharmalist", "niftyfmcglist", "niftyrealtylist", "niftyinfralist", "niftypsubanklist"];

async function universe() {
  const out = new Set();
  for (const l of LISTS) {
    try {
      const r = await fetch(`https://nsearchives.nseindia.com/content/indices/ind_${l}.csv`, { headers: { "User-Agent": UA } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const rows = (await r.text()).split(/\r?\n/).slice(1);
      for (const row of rows) { const sym = row.split(",")[2]?.trim(); if (sym && /^[A-Z0-9&.\-]{1,20}$/.test(sym) && !/^DUMMY/i.test(sym)) out.add(sym); }
    } catch (e) { console.warn(`list ${l} failed: ${e.message}`); }
  }
  return [...out].sort();
}

async function warm(symbol) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await fetch(`${SITE}/api/research/concall?symbol=${encodeURIComponent(symbol)}&warm=${Date.now()}`, { signal: AbortSignal.timeout(90_000) });
      if (r.ok) { const j = await r.json(); return { symbol, status: j.status, calls: j.history?.length ?? 0 }; }
    } catch { /* retry once */ }
    await new Promise((res) => setTimeout(res, 3000));
  }
  return { symbol, status: "request_failed", calls: 0 };
}

let symbols = ONLY ? ONLY.split(",").map((s) => s.trim().toUpperCase()) : await universe();
if (LIMIT) symbols = symbols.slice(0, LIMIT);
console.log(`Warming ${symbols.length} symbols against ${SITE}`);
const tally = {}; const missing = []; let i = 0, done = 0;
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (i < symbols.length && Date.now() < DEADLINE) {
    const res = await warm(symbols[i++]);
    tally[res.status] = (tally[res.status] ?? 0) + 1;
    if (res.status !== "ready") missing.push(`${res.symbol}:${res.status}`);
    if (++done % 25 === 0) console.log(`${done}/${symbols.length}`, JSON.stringify(tally));
  }
}));
console.log("DONE", `${done}/${symbols.length}`, JSON.stringify(tally));
if (done < symbols.length) console.log(`Stopped at time budget; ${symbols.length - done} remain for the next run.`);
console.log("Not ready:", missing.join(" "));
