/** Node 20+: offline BRSR extraction, read-only dry-run or authenticated batch upload.
 * node scripts/build-pay-table.mjs --dry-run [--only TCS,INFY] [--resume out/pay-state.json]
 * node scripts/build-pay-table.mjs --site https://getmarketintelligence.in
 */
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { Worker } from "node:worker_threads";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { PAY_PARSER_VERSION, filingDateIso, validatePayRows } from "../src/lib/research/brsr-pay.mjs";

export const LISTS = ["niftytotalmarket_list", "nifty50list", "niftynext50list", "nifty100list", "nifty200list", "nifty500list", "niftylargemidcap250list", "niftymidcap150list", "niftymidcap100list", "niftysmallcap250list", "niftysmallcap100list", "niftymicrocap250_list", "niftybanklist", "niftyfinancialservices25-50list", "niftyitlist", "niftymetallist", "niftyenergylist", "niftyautolist", "niftypharmalist", "niftyfmcglist", "niftyrealtylist", "niftyinfralist", "niftypsubanklist"];
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const NSE = "https://www.nseindia.com";
const sleep = (n) => new Promise((r) => setTimeout(r, n));
export const completedFy = (now = new Date()) => `FY${String(now.getUTCFullYear() - (now.getUTCMonth() < 3 ? 1 : 0)).slice(-2)}`;
export function parseCsv(csv) {
  return csv.split(/\r?\n/).map((line) => {
    const cells = []; let part = "", quoted = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"' && line[i + 1] === '"' && quoted) { part += '"'; i++; }
      else if (line[i] === '"') quoted = !quoted;
      else if (line[i] === "," && !quoted) { cells.push(part); part = ""; }
      else part += line[i];
    }
    cells.push(part); return cells;
  });
}
export function filingList(payload, symbol) {
  const data = Array.isArray(payload) ? payload : payload?.data;
  if (!Array.isArray(data)) throw new Error("Invalid NSE BRSR list response");
  if (data.length && !data.some((f) => f && (!f.symbol || f.symbol.toUpperCase() === symbol) && f.attachmentFile)) throw new Error("Nonempty NSE list has no usable filing for this symbol");
  return data.filter((f) => (!f.symbol || f.symbol.toUpperCase() === symbol) && f.attachmentFile).map((f) => {
    const year = Number(f.fyTo);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new Error("Unrecognised filing FY");
    const url = new URL(f.attachmentFile);
    if (url.protocol !== "https:" || !["nsearchives.nseindia.com", "archives.nseindia.com", "www.nseindia.com"].includes(url.hostname) || url.username || url.password || url.port) throw new Error("Unsupported NSE attachment URL");
    return { fy: `FY${String(year).slice(-2)}`, sourceUrl: url.href, filingDate: filingDateIso(f.revisionDate) ?? filingDateIso(f.submissionDate), year };
  }).sort((a, b) => b.year - a.year || (b.filingDate ?? "").localeCompare(a.filingDate ?? ""))
    .filter((f, i, files) => files.findIndex((v) => v.fy === f.fy) === i);
}

async function readResponse(res, maxBytes) {
  if (Number(res.headers.get("content-length")) > maxBytes) { await res.body?.cancel(); throw new Error("File exceeds size limit"); }
  const reader = res.body?.getReader(); if (!reader) throw new Error("Empty response");
  const parts = []; let size = 0;
  try { for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > maxBytes) throw new Error("File exceeds size limit"); parts.push(value); } }
  finally { await reader.cancel().catch(() => {}); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.length; }
  return bytes;
}
export async function requestBytes(url, { cookie = "", maxBytes = 100 * 1024 * 1024, timeoutMs = 60000, attempts = 3 } = {}) {
  let last;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const u = new URL(url);
      const headers = { "User-Agent": UA, Referer: `${NSE}/`, Accept: "*/*" };
      if (cookie && u.origin === NSE) headers.Cookie = cookie;
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs), redirect: "error" });
      if (!res.ok) { await res.body?.cancel(); const e = new Error(`HTTP ${res.status}`); e.httpStatus = res.status; throw e; }
      const bytes = await readResponse(res, maxBytes);
      const cookies = (res.headers.getSetCookie?.() ?? []).map((s) => s.split(";")[0]).join("; ");
      return { bytes, cookies };
    } catch (error) {
      last = error;
      if ([400, 404, 410].includes(error.httpStatus)) break;
      if (attempt < attempts - 1) await sleep(1000 * 2 ** attempt + Math.random() * 300);
    }
  }
  throw last;
}
async function universe() {
  const symbols = new Set(), sources = [], failures = [];
  for (const name of LISTS) {
    try {
      const url = `https://nsearchives.nseindia.com/content/indices/ind_${name}.csv`;
      const { bytes } = await requestBytes(url, { maxBytes: 2 * 1024 * 1024, timeoutMs: 15000, attempts: 2 });
      const csv = parseCsv(new TextDecoder().decode(bytes));
      const index = csv[0].findIndex((h) => /^symbol$/i.test(h.trim()));
      if (index < 0) throw new Error("CSV Symbol column not found");
      let count = 0;
      for (const row of csv.slice(1)) { const s = row[index]?.trim().toUpperCase(); if (/^[A-Z0-9&.\-]{1,20}$/.test(s ?? "") && !/^DUMMY/.test(s)) { symbols.add(s); count++; } }
      if (!count) throw new Error("Empty constituent list");
      sources.push({ name, count });
    } catch (error) { failures.push({ name, reason: error.message }); }
  }
  return { symbols: [...symbols].sort(), sources, failures, complete: ["nifty500list", "niftymicrocap250_list"].every((n) => sources.some((s) => s.name === n)) };
}
function scan(bytes) {
  return new Promise((resolveResult, reject) => {
    const worker = new Worker(new URL("./lib/pay-pdf-worker.mjs", import.meta.url));
    const timer = setTimeout(() => { void worker.terminate(); reject(new Error("PDF worker time limit reached")); }, 100000);
    const finish = () => { clearTimeout(timer); void worker.terminate(); };
    worker.once("message", (m) => { finish(); if (m.error) reject(new Error(m.error)); else resolveResult(m.result); });
    worker.once("error", (e) => { finish(); reject(e); });
    worker.once("exit", (code) => { if (code) { clearTimeout(timer); reject(new Error("PDF worker stopped")); } });
    worker.postMessage({ bytes: bytes.buffer, options: { maxPages: 600, timeoutMs: 90000 } }, [bytes.buffer]);
  });
}
function tableEvidence(text) {
  // Keep factual table cells and unit context, not full pages or narrative report text.
  const flat = text.replace(/\s+/g, " ");
  const starts = [...flat.matchAll(/Board of Directors(?:\s*\(BoD\))?\s*[*#^]*\s*(?:\d|Nil|NA)/gi)];
  const start = starts.at(-1)?.index ?? Math.max(0, flat.search(/median\s+(?:remuneration|salary|wages)|remuneration\s*\/\s*salary\s*\/\s*wages/i));
  const table = flat.slice(Math.max(start, 0), Math.max(start, 0) + 2000);
  const end = table.search(/(?:b\.\s|gross wages|minimum wages|discrimination|human rights|complaints|3\.b|•|Notes?\s*:|\*\s*Data pertains)/i);
  const units = [...new Set((flat.slice(0, Math.max(start, 0) + 200).match(/lakhs?|lacs?|crores?|millions?|rupees|\bINR\b|\bRs\.?|\bCr\b/gi) ?? []).map(s => s.toLowerCase()))];
  return `${units.length ? `Unit text: ${units.join(", ")}. ` : ""}${table.slice(0, end > 0 ? end : 1200)}`;
}
async function collect(symbol, getCookie, state, force) {
  const now = new Date().toISOString();
  const base = { symbol, fy: completedFy(), sourceUrl: null, rows: [], extractedBy: "rules", status: "not_filed", reason: null, filingDate: null, updatedAt: now };
  let files;
  try {
    const { bytes } = await requestBytes(`${NSE}/api/corporate-bussiness-sustainabilitiy?index=equities&symbol=${encodeURIComponent(symbol)}&from_date=01-04-${new Date().getUTCFullYear() - 3}&to_date=${new Date().toISOString().slice(0,10).split("-").reverse().join("-")}`, { cookie: await getCookie(), maxBytes: 5 * 1024 * 1024, timeoutMs: 20000 });
    const listed = filingList(JSON.parse(new TextDecoder().decode(bytes)), symbol);
    // Keep the newest revision for each FY so amendments cannot consume all
    // three attempts or silently replace a revised table with an older version.
    files = listed.slice(0, 3);
  } catch (error) {
    // A failed catalogue is NOT evidence the company has not filed.
    return { records: [{ ...base, status: "unreadable", reason: `Filing list unavailable: ${error.message}` }], evidence: [], catalogueUnavailable: true };
  }
  if (!files.length) return { records: [base], evidence: [], catalogueUnavailable: false };
  const records = [], evidence = [];
  for (const f of files) {
    const current = { ...base, ...f }; delete current.year;
    const previous = state[symbol]?.records?.find((r) => r.fy === f.fy && r.sourceUrl === f.sourceUrl && r.filingDate === f.filingDate && r.status === "ok");
    if (!force && state[symbol]?.parserVersion === PAY_PARSER_VERSION && previous && validatePayRows(previous.rows)) {
      records.push({ ...previous, updatedAt: now });
      evidence.push(...(state[symbol].evidence ?? []).filter((e) => e.fy === f.fy));
      return { records, evidence, catalogueUnavailable: false, parserVersion: state[symbol]?.parserVersion ?? null, reused: true };
    }
    try {
      const { bytes } = await requestBytes(f.sourceUrl, { timeoutMs: 45000, attempts: 2 });
      if (new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-") throw new Error("Attachment is not a PDF (blocked or invalid response)");
      const out = await scan(bytes);
      if (!validatePayRows(out.rows)) {
        records.push({ ...current, status: "unreadable", reason: out.reason || "Pay table failed validation" });
        continue;
      }
      records.push({ ...current, status: "ok", rows: out.rows });
      evidence.push({ fy: f.fy, sourceUrl: f.sourceUrl, pages: out.pages, tableText: tableEvidence(out.evidence), rows: out.rows });
      break;
    } catch (error) { records.push({ ...current, status: [403, 404, 410].includes(error.httpStatus) ? "dead_link" : "unreadable", reason: error.message }); }
  }
  // PK is (symbol,FY): revised same-year filings must not be sent as contradictory duplicate rows.
  const unique = new Map(); for (const row of records) if (!unique.has(row.fy) || row.status === "ok") unique.set(row.fy, row);
  return { records: [...unique.values()], evidence, catalogueUnavailable: false };
}
export async function main(argv = process.argv.slice(2)) {
  const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i < 0 ? d : argv[i + 1]; };
  const dryRun = argv.includes("--dry-run");
  const only = arg("only", ""); const limit = Number(arg("limit", 0));
  const site = arg("site", process.env.SITE_URL || "https://getmarketintelligence.in").replace(/\/$/, "");
  if (!dryRun && !process.env.CRON_SECRET) throw new Error("CRON_SECRET is required for upload; use --dry-run to extract without uploading");
  if (!dryRun && new URL(site).protocol !== "https:") throw new Error("Upload site must use HTTPS");
  const output = resolve(arg("out", "out")); await mkdir(output, { recursive: true });
  const stateFile = resolve(arg("resume", `${output}/pay-state.json`));
  let state = {}; try { state = JSON.parse(await readFile(stateFile, "utf8")); } catch { /* first run */ }
  let checkpoint = Promise.resolve();
  const saveState = () => { checkpoint = checkpoint.then(async () => { await mkdir(resolve(stateFile, ".."), { recursive: true }); await writeFile(`${stateFile}.tmp`, JSON.stringify(state)); await rename(`${stateFile}.tmp`, stateFile); }); return checkpoint; };
  const startedAt = new Date().toISOString();
  const catalog = only ? { symbols: only.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean), sources: [], failures: [], complete: false } : await universe();
  if (catalog.symbols.some((s) => !/^[A-Z0-9&.\-]{1,20}$/.test(s))) throw new Error("Invalid --only symbol");
  const symbols = [...new Set(catalog.symbols)].slice(0, limit || undefined);
  if (!symbols.length) throw new Error("No universe symbols discovered; refusing to claim a completed batch");
  let cookie = "", cookieAt = 0, session;
  const getCookie = async () => {
    if (cookieAt > Date.now() - 240000) return cookie;
    if (!session) session = (async () => {
      const home = await requestBytes(`${NSE}/`, { maxBytes: 5 * 1024 * 1024, timeoutMs: 20000 });
      cookie = home.cookies;
      if (!cookie) cookie = (await requestBytes(`${NSE}/market-data/live-equity-market`, { maxBytes: 5 * 1024 * 1024, timeoutMs: 20000 })).cookies;
      cookieAt = Date.now(); return cookie;
    })().finally(() => { session = undefined; });
    return session;
  };
  const results = []; let next = 0;
  const deadline = Date.now() + Number(arg("budget-min", 300)) * 60000;
  console.log(`Processing ${symbols.length} companies, concurrency 2, ${dryRun ? "dry-run" : "upload after extraction"}`);
  await Promise.all(Array.from({ length: 2 }, async () => {
    while (next < symbols.length && Date.now() < deadline) {
      const symbol = symbols[next++];
      const result = { parserVersion: PAY_PARSER_VERSION, ...await collect(symbol, getCookie, state, argv.includes("--force")) };
      results.push({ symbol, ...result }); state[symbol] = result; await saveState();
      if (results.length % 10 === 0) console.log(`${results.length}/${symbols.length}: ${results.filter((r) => r.records.some((x) => x.status === "ok")).length} companies with readable pay`);
      await sleep(300);
    }
  }));
  results.sort((a, b) => a.symbol.localeCompare(b.symbol));
  const tallies = { ok: 0, unreadable: 0, dead_link: 0, not_filed: 0 };
  for (const r of results) tallies[r.records.some((v) => v.status === "ok") ? "ok" : r.records[0].status]++;
  const knownFilers = results.filter((r) => r.records.some((v) => v.sourceUrl)).length;
  const currentFyOk = results.filter((r) => r.records.some((v) => v.status === "ok" && v.fy === completedFy())).length;
  const companyFailures = results.filter((r) => !r.records.some((v) => v.status === "ok")).map((r) => ({ symbol: r.symbol, status: r.records[0].status, fy: r.records[0].fy, reason: r.records[0].reason, sourceUrl: r.records[0].sourceUrl }));
  const outputData = { startedAt, finishedAt: new Date().toISOString(), dryRun, parserVersion: PAY_PARSER_VERSION, universe: { discovered: catalog.symbols.length, selected: symbols.length, processed: results.length, unprocessed: symbols.filter((s) => !results.some((r) => r.symbol === s)), indexCoverageComplete: catalog.complete, sources: catalog.sources, failures: catalog.failures }, coverage: tallies, coverageMetrics: { knownFilers, readableAmongKnownFilersPct: knownFilers ? Math.round(tallies.ok / knownFilers * 10000) / 100 : null, currentFy: completedFy(), currentFyOk, olderFyOk: tallies.ok - currentFyOk }, companyFailures, catalogueUnavailable: results.filter((r) => r.catalogueUnavailable).length, results };
  const file = `${output}/pay-${startedAt.replace(/[:.]/g, "-")}.json`; await writeFile(file, JSON.stringify(outputData, null, 2));
  console.log(`Saved ${file}; coverage ${JSON.stringify(tallies)}`);
  if (!dryRun) {
    const rows = results.flatMap((r) => r.records).map(({ updatedAt: _updatedAt, ...r }) => r);
    for (let i = 0; i < rows.length; i += 50) {
      const res = await fetch(`${site}/api/cron/company-pay`, { method: "POST", redirect: "error", signal: AbortSignal.timeout(60000), headers: { Authorization: `Bearer ${process.env.CRON_SECRET}`, "Content-Type": "application/json" }, body: JSON.stringify({ rows: rows.slice(i, i + 50) }) });
      if (!res.ok) { await res.body?.cancel(); throw new Error(`Ingest HTTP ${res.status}; dry-run JSON preserved for retry`); }
      const response = await res.json(); if (!response.ok) throw new Error("Ingest did not confirm success");
    }
  }
  if (results.length < symbols.length || (!only && !catalog.complete)) process.exitCode = 2;
  return outputData;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch((e) => { console.error(`Batch stopped: ${e.message}`); process.exitCode = 1; });
