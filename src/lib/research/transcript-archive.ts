import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import { ensureSchema, hasDatabase, sql, toDateString } from "@/lib/db";
import { findCandidates, summarizeTranscript, type Candidate, type ConcallRow } from "@/lib/collector/concalls";
import { detectQuarter } from "@/lib/collector/concall-nlp";

export type Market = "IN" | "US";
export type Summary = Omit<ConcallRow, "contentHash"> & { toneDelta: number | null };
export type Archive = {
  symbol: string; market: Market; dbConfigured: boolean;
  summary: Summary | null; history: Summary[];
  documents: { title: string; url: string }[];
  status: "ready" | "unavailable" | "source_error";
  message: string; checkedAt: string;
};

// Curated IR entry points complement generic NSE/Screener discovery. No guessed PDF URLs.
const IR: Record<string, string[]> = {
  ADANIPORTS: ["https://www.adaniports.com/Investors/Investor-Downloads"],
  INFY: ["https://www.infosys.com/investors/reports-filings/quarterly-results.html"],
  TCS: ["https://www.tcs.com/investor-relations/financial-statements"],
};
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const MAX_BYTES = 12 * 1024 * 1024;
const privateIPv4 = new BlockList();
const privateIPv6 = new BlockList();
for (const [ip, prefix] of [["0.0.0.0", 8], ["10.0.0.0", 8], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.168.0.0", 16], ["100.64.0.0", 10], ["224.0.0.0", 4], ["240.0.0.0", 4]] as const) privateIPv4.addSubnet(ip, prefix, "ipv4");
for (const [ip, prefix] of [["::", 128], ["::1", 128], ["fc00::", 7], ["fe80::", 10], ["ff00::", 8], ["::ffff:0:0", 96]] as const) privateIPv6.addSubnet(ip, prefix, "ipv6");

/** All discovered links and redirect targets must resolve to public HTTPS hosts. */
export async function validateSource(url: string) {
  const u = new URL(url);
  if (u.protocol !== "https:" || u.username || u.password || (u.port && u.port !== "443")) throw new Error("Unsafe source URL");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || /\.(local|internal|localhost)$/i.test(host)) throw new Error("Private source host");
  const addresses = isIP(host) ? [{ address: host, family: isIP(host) }] : await lookup(host, { all: true });
  if (!addresses.length || addresses.some((a) => (a.family === 6 ? privateIPv6.check(a.address, "ipv6") : privateIPv4.check(a.address, "ipv4")))) throw new Error("Private source address");
}

/** Timeout covers the body as well as headers; streaming size guard prevents unbounded buffers. */
async function download(url: string, signal: AbortSignal, headers: Record<string, string> = {}, redirects = 0): Promise<{ bytes: Uint8Array; type: string; cookie: string; url: string }> {
  // BSE's AnnPdfOpen redirect carries malformed headers that Node's HTTP parser rejects; go straight to the file it points at.
  const bse = /^https:\/\/www\.bseindia\.com\/stockinfo\/AnnPdfOpen\.aspx\?Pname=([\w-]+\.pdf)$/i.exec(url);
  if (bse) {
    try { return await download(`https://www.bseindia.com/xml-data/corpfiling/AttachHis/${bse[1]}`, signal, headers, redirects); }
    catch { return download(`https://www.bseindia.com/xml-data/corpfiling/AttachLive/${bse[1]}`, signal, headers, redirects); }
  }
  await validateSource(url);
  const res = await fetch(url, { signal, redirect: "manual", headers: { "User-Agent": UA, ...(/(^|\.)bseindia\.com$/i.test(new URL(url).hostname) ? { Referer: "https://www.bseindia.com/" } : {}), ...headers } });
  if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
    await res.body?.cancel();
    if (redirects >= 3) throw new Error("Too many redirects");
    // Never forward NSE cookies to another origin.
    const next = new URL(res.headers.get("location")!, url).href;
    return download(next, signal, new URL(next).origin === new URL(url).origin ? headers : {}, redirects + 1);
  }
  if (!res.ok) { await res.body?.cancel(); throw new Error(`Source HTTP ${res.status}`); }
  if (Number(res.headers.get("content-length")) > MAX_BYTES) { await res.body?.cancel(); throw new Error("Source too large"); }
  const reader = res.body?.getReader();
  if (!reader) throw new Error("Empty source");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_BYTES) throw new Error("Source too large");
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) { bytes.set(c, offset); offset += c.length; }
  return { bytes, type: res.headers.get("content-type") ?? "", cookie: (res.headers.getSetCookie?.() ?? []).map((s) => s.split(";")[0]).join("; "), url };
}
const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, " ").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
export const htmlText = (s: string) => decode(s.replace(/<(script|style|nav|footer)\b[^>]*>[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
export function transcriptLinks(html: string, base: string): { title: string; url: string }[] {
  const out = new Map<string, { title: string; url: string }>();
  for (const m of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const title = htmlText(m[2]);
    let url: string;
    try { url = new URL(decode(m[1]), base).href; } catch { continue; }
    // IR headings can label a whole transcript section; URL itself then carries the cue.
    if (!/transcript|concall/i.test(`${title} ${url}`) || /annual.general.meeting|\bagm\b|postal.ballot/i.test(`${title} ${url}`)) continue;
    if (url === base || /\/transcripts\/?$/i.test(new URL(url).pathname)) continue;
    if (new URL(base).hostname === "stockanalysis.com" && !/earnings|\/[^/]*q[1-4]-20\d{2}\//i.test(`${title} ${url}`)) continue;
    if (!/^https:/.test(url) || /audio|video|recording|general.meeting/i.test(`${title} ${url}`)) continue;
    out.set(url, { title: title || "Earnings-call transcript", url });
  }
  return [...out.values()];
}

/** Preserve explicit HTML speaker blocks; do not analyse a provider's separate AI summary. */
export function transcriptHtmlText(html: string): string {
  const marker = /<div\b[^>]*aria-label=["']Full transcript["'][^>]*>/i.exec(html);
  let body = html;
  if (marker) {
    const start = marker.index + marker[0].length;
    let depth = 1;
    const tags = /<\/?div\b[^>]*>/gi;
    tags.lastIndex = start;
    for (let tag = tags.exec(html); tag; tag = tags.exec(html)) {
      depth += /^<\//.test(tag[0]) ? -1 : 1;
      if (!depth) { body = html.slice(start, tag.index); break; }
    }
  }
  body = body.replace(/<div\b[^>]*class=["'][^"']*font-bold[^"']*["'][^>]*>([^<]{2,80})<\/div>([\s\S]{0,350}?)(?=<p\b)/gi, (_, name, role) => {
    const speaker = /investor relations|operator|moderator/i.test(htmlText(role)) ? "Moderator" : htmlText(name);
    return ` ${speaker}: `;
  });
  return htmlText(body);
}

const quarterRank = (s: string) => {
  const m = /Q([1-4]) (?:FY)?(?:20)?(\d{2})/.exec(detectQuarter(s) ?? "");
  return m ? +m[2] * 4 + +m[1] : 0;
};
const dmy = (ms: number) => { const d = new Date(ms); return `${String(d.getUTCDate()).padStart(2, "0")}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${d.getUTCFullYear()}`; };

async function discover(symbol: string, market: Market, signal: AbortSignal) {
  const candidates: Candidate[] = [];
  const documents: { title: string; url: string }[] = [];
  let failures = 0;
  const pages = market === "IN" ? [...(IR[symbol] ?? []), `https://www.screener.in/company/${encodeURIComponent(symbol)}/consolidated/`] : [`https://stockanalysis.com/stocks/${encodeURIComponent(symbol.toLowerCase())}/transcripts/`];
  // Fetch independent archive sources concurrently; an IR link can itself be broken.
  const exchangeTask = (async () => {
  if (market === "IN" && !signal.aborted) {
    try {
      const bounded = AbortSignal.any([signal, AbortSignal.timeout(8_000)]);
      const home = await download("https://www.nseindia.com/", bounded);
      const headers = { Cookie: home.cookie, Referer: "https://www.nseindia.com/", Accept: "application/json" };
      const now = Date.now();
      const windows = await Promise.allSettled([0, 1, 2, 3].map(async (i) => {
        const to = now - i * 90 * 86400_000;
        const path = `https://www.nseindia.com/api/corporate-announcements?index=equities&symbol=${encodeURIComponent(symbol)}&from_date=${dmy(to - 90 * 86400_000)}&to_date=${dmy(to)}`;
        const r = await download(path, bounded, headers);
        const raw = JSON.parse(new TextDecoder().decode(r.bytes));
        if (!Array.isArray(raw)) throw new Error("Invalid exchange response");
        return findCandidates(raw, {}, new Set([symbol]), 8);
      }));
      for (const w of windows) {
        if (w.status === "fulfilled") candidates.push(...w.value);
        else failures++;
      }
    } catch { failures++; }
  }
  })();
  const results = await Promise.allSettled(pages.map(async (page) => {
    const r = await download(page, AbortSignal.any([signal, AbortSignal.timeout(10_000)]));
    const html = new TextDecoder().decode(r.bytes);
    if (/site unavailable|access denied|captcha|verify you are human/i.test(htmlText(html).slice(0, 1000))) throw new Error("Source blocked");
    return transcriptLinks(html, r.url);
  }));
  for (const r of results) {
    if (r.status === "rejected") failures++;
    else documents.push(...r.value);
  }
  await exchangeTask;
  documents.sort((a, b) => quarterRank(`${b.title} ${b.url}`) - quarterRank(`${a.title} ${a.url}`));
  // Archive/IR transcript links come first: exchange filings are often one-page intimations or cover letters.
  const byUrl = new Map<string, Candidate>();
  for (const d of documents) byUrl.set(d.url, { symbol, headline: d.title, url: d.url, broadcastIso: "" });
  for (const c of candidates) if (!byUrl.has(c.url) || c.broadcastIso) byUrl.set(c.url, c);
  const unique = [...byUrl.values()].slice(0, 12);
  return { candidates: unique, documents: [...new Map([...documents, ...unique.map((c) => ({ title: c.headline, url: c.url }))].map((d) => [d.url, d])).values()].slice(0, 12), failures };
}

/** Extract an explicit call date; never manufacture a publication date from a fiscal quarter. */
export function callDate(text: string): string | null {
  const head = text.slice(0, 8000);
  const m = /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(20\d{2})\b/i.exec(head);
  if (!m) return null;
  const date = new Date(`${m[1]} ${m[2]}, ${m[3]} UTC`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}
async function sourceText(c: Candidate, signal: AbortSignal, depth = 0): Promise<{ text: string; url: string }> {
  const r = await download(c.url, AbortSignal.any([signal, AbortSignal.timeout(12_000)]));
  if (new TextDecoder().decode(r.bytes.slice(0, 5)) === "%PDF-") {
    const { extractText, extractLinks, getDocumentProxy } = await import("unpdf");
    const proxy = await getDocumentProxy(r.bytes);
    try {
      if (proxy.numPages > 150) throw new Error("Transcript has too many pages");
      const extracted = await extractText(proxy, { mergePages: true });
      const text = Array.isArray(extracted.text) ? extracted.text.join("\n") : extracted.text;
      // Exchange cover letters frequently link to the actual company transcript.
      if (text.replace(/\s+/g, " ").length < 4000) {
        const annotations = await extractLinks(proxy).catch(() => ({ links: [] as string[] }));
        const links = [...annotations.links, ...[...text.matchAll(/https:\/\/[^\s<>"()]+/g)].map((m) => m[0].replace(/[.,;]+$/, ""))];
        const linked = links.find((u) => /\.pdf(?:\?|$)/i.test(u) && /transcript|earnings|concall/i.test(u) && u !== c.url);
        if (linked && depth < 2) return sourceText({ ...c, url: linked }, signal, depth + 1);
      }
      return { text, url: r.url };
    } finally { await (proxy as unknown as { destroy?: () => Promise<void> }).destroy?.(); }
  }
  if (!/html|text/i.test(r.type)) throw new Error("Unsupported source format");
  const html = new TextDecoder().decode(r.bytes);
  const body = /<article\b[^>]*>([\s\S]*?)<\/article>/i.exec(html)?.[1] ?? /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(html)?.[1] ?? html;
  const text = transcriptHtmlText(body);
  if (!/earnings|conference call|results call/i.test(text.slice(0, 5000))) throw new Error("Not a call transcript");
  return { text, url: r.url };
}

async function stored(symbol: string): Promise<Summary[]> {
  if (!hasDatabase()) return [];
  await ensureSchema();
  const rows = await sql()`SELECT * FROM concall_summaries WHERE symbol = ${symbol} ORDER BY transcript_date DESC NULLS LAST, created_at DESC LIMIT 8`;
  return rows.map((r) => ({ symbol, quarter: r.quarter, transcriptDate: r.transcript_date ? toDateString(r.transcript_date) : null, guidance: r.guidance ?? [], growthDrivers: r.growth_drivers ?? [], risks: r.risks ?? [], qaThemes: r.qa_themes ?? [], tonePrepared: r.tone_prepared == null ? null : Number(r.tone_prepared), toneQa: r.tone_qa == null ? null : Number(r.tone_qa), toneDelta: r.tone_delta == null ? (r.tone_prepared == null || r.tone_qa == null ? null : Math.round((Number(r.tone_qa) - Number(r.tone_prepared)) * 1000) / 1000) : Number(r.tone_delta), sourceUrl: r.source_url, generatedBy: r.generated_by ?? "extractive-rules" }));
}
async function persist(r: ConcallRow) {
  if (!hasDatabase()) return;
  await ensureSchema();
  await sql()`INSERT INTO concall_summaries (symbol, quarter, transcript_date, guidance, growth_drivers, risks, qa_themes, tone_prepared, tone_qa, source_url, content_hash, generated_by)
    VALUES (${r.symbol}, ${r.quarter}, ${r.transcriptDate}, ${r.guidance}, ${r.growthDrivers}, ${r.risks}, ${r.qaThemes}, ${r.tonePrepared}, ${r.toneQa}, ${r.sourceUrl}, ${r.contentHash}, ${r.generatedBy}) ON CONFLICT (content_hash) DO UPDATE SET tone_prepared = COALESCE(concall_summaries.tone_prepared, EXCLUDED.tone_prepared), tone_qa = COALESCE(concall_summaries.tone_qa, EXCLUDED.tone_qa),
      tone_delta = COALESCE(concall_summaries.tone_delta, ${r.tonePrepared !== null && r.toneQa !== null ? Math.round((r.toneQa - r.tonePrepared) * 1000) / 1000 : null}), generated_by = CASE WHEN concall_summaries.tone_prepared IS NULL THEN EXCLUDED.generated_by ELSE concall_summaries.generated_by END`;
}
const cache = new Map<string, { until: number; value: Archive }>();
const pending = new Map<string, Promise<Archive>>();
/** Bounded, single-flight cold retrieval; DB remains usable when a source is down. */
export async function getTranscriptArchive(symbol: string, market: Market = "IN"): Promise<Archive> {
  symbol = symbol.trim().toUpperCase();
  if (!["IN", "US"].includes(market) || !/^[A-Z0-9&.\-]{1,20}$/.test(symbol)) throw new Error("Invalid symbol");
  const key = `${market}:${symbol}`;
  const hit = cache.get(key);
  if (hit && hit.until > Date.now()) return hit.value;
  const running = pending.get(key);
  if (running) return running;
  const job = (async () => {
    const signal = AbortSignal.timeout(40_000);
    let failures = 0;
    // US rows are namespaced internally to prevent collisions with NSE tickers (e.g. BSE).
    const storageSymbol = market === "US" ? `US:${symbol}` : symbol;
    if (hasDatabase()) {
      const disk = await (async () => {
        await ensureSchema();
        const rows = await sql()`SELECT payload FROM transcript_archive_cache WHERE cache_key = ${key} AND expires_at > now()`;
        return rows[0]?.payload as Archive | undefined;
      })().catch(() => undefined);
      if (disk) { cache.set(key, { value: disk, until: Date.now() + 60_000 }); return disk; }
    }
    const history = await stored(storageSymbol).catch(() => { failures++; return [] as Summary[]; });
    const found = await discover(symbol, market, signal);
    failures += found.failures;
    // Calls stored without a tone (scored before the in-house scorer existed) are re-read once to fill it in.
    const known = new Set(history.filter((r) => r.tonePrepared !== null).map((r) => r.sourceUrl));
    // Only parsed calls and hard failures use the budget; cover letters/intimations that yield no text are skipped for free.
    let attempted = 0;
    for (const c of found.candidates) {
      if (signal.aborted || attempted >= 4) break;
      if (known.has(c.url)) continue;
      try {
        const source = await sourceText(c, signal);
        if (known.has(source.url)) continue;
        const out = await summarizeTranscript({ ...c, url: source.url }, source.text, { hf: false });
        if (!("row" in out)) continue;
        attempted++;
        out.row.transcriptDate = c.broadcastIso ? c.broadcastIso.slice(0, 10) : callDate(source.text);
        await persist({ ...out.row, symbol: storageSymbol }).catch(() => { failures++; });
        const { contentHash: _hash, ...row } = out.row;
        void _hash;
        const delta = row.tonePrepared !== null && row.toneQa !== null ? Math.round((row.toneQa - row.tonePrepared) * 1000) / 1000 : null;
        const at = history.findIndex((h) => h.sourceUrl === row.sourceUrl);
        if (at >= 0) history.splice(at, 1); // re-read to fill a missing tone: replace, never duplicate
        history.push({ ...row, toneDelta: delta });
        known.add(source.url);
      } catch { failures++; attempted++; }
    }
    history.sort((a, b) => (b.transcriptDate ?? "").localeCompare(a.transcriptDate ?? "") || quarterRank(b.quarter ?? "") - quarterRank(a.quarter ?? ""));
    const publicHistory = history.slice(0, 8).map((r) => ({ ...r, symbol }));
    const value: Archive = { symbol, market, dbConfigured: hasDatabase(), summary: publicHistory[0] ?? null, history: publicHistory, documents: found.documents, status: history.length ? "ready" : failures ? "source_error" : "unavailable", message: history.length ? "Highlights extracted from linked earnings-call transcripts." : failures ? "Some archive sources could not be reached. This does not mean the company has no transcripts. Try again shortly or open the archive links." : found.documents.length ? "Transcript links found, but readable call text could not be extracted. Open the originals below." : "No accessible transcript was found in the sources checked. This is not a claim that no transcript exists.", checkedAt: new Date().toISOString() };
    if (cache.size >= 200) cache.delete(cache.keys().next().value!);
    // Confirmed absence is cached for hours so thousands of small caps do not re-crawl on every visit; transient failures retry within a minute.
    const ttl = history.length ? 24 * 3600_000 : failures ? 60_000 : 6 * 3600_000;
    cache.set(key, { value, until: Date.now() + Math.min(ttl, 6 * 3600_000) });
    if (hasDatabase()) {
      await sql()`INSERT INTO transcript_archive_cache (cache_key, payload, expires_at)
        VALUES (${key}, ${JSON.stringify(value)}::jsonb, ${new Date(Date.now() + ttl).toISOString()}::timestamptz)
        ON CONFLICT (cache_key) DO UPDATE SET payload = EXCLUDED.payload, expires_at = EXCLUDED.expires_at`.catch(() => {});
    }
    return value;
  })();
  pending.set(key, job);
  try { return await job; } finally { pending.delete(key); }
}
