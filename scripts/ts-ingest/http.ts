import { createHash } from "node:crypto";

const UA = "Mozilla/5.0 (MarketIntelligence)";
const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/** True when a body is an HTML page (soft-404 / WAF / error page) rather than data. */
export const looksLikeHtml = (buf: Buffer): boolean => /^\s*(<!doctype html|<html|<head|<body)/i.test(buf.subarray(0, 200).toString("utf8"));
export const bodyHead = (buf: Buffer, n = 160): string => buf.subarray(0, n).toString("utf8").replace(/\s+/g, " ").trim();

const jars = new Map<string, string>();
async function warmHost(warmUrl: string) {
  const host = new URL(warmUrl).host;
  if (jars.has(host)) return;
  const r = await fetch(warmUrl, { headers: { "user-agent": BROWSER_UA, accept: "text/html,*/*" }, signal: AbortSignal.timeout(30_000) });
  const set = (r.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
  jars.set(host, set.map((c) => c.split(";")[0]).join("; "));
}
const lastHit = new Map<string, number>();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type Fetched = { status: number; buf: Buffer; etag: string | null; lastModified: string | null; sha256: string; bytes: number };

let nseCookie = "";
async function warmNse() {
  const r = await fetch("https://www.nseindia.com/", { headers: { "user-agent": UA, accept: "text/html" } });
  const set = (r.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
  nseCookie = set.map((c) => c.split(";")[0]).join("; ");
}

/** Polite fetch: >=1 s per host, 30 s timeout, 3 retries (2/8/30 s). NSE gets cookie warm-up + one re-warm on 403. Returns the final response; never throws on HTTP status. */
export async function politeFetch(url: string, opts: { nse?: boolean; warm?: string; browser?: boolean; method?: string; body?: string; headers?: Record<string, string>; prev?: { etag?: string | null; last_modified?: string | null } } = {}): Promise<Fetched> {
  const host = new URL(url).host;
  const backoff = [2000, 8000, 30000];
  let lastErr: unknown;
  for (let attempt = 0; attempt <= backoff.length; attempt++) {
    const wait = (lastHit.get(host) ?? 0) + 1000 - Date.now();
    if (wait > 0) await sleep(wait);
    lastHit.set(host, Date.now());
    try {
      if (opts.nse && !nseCookie) await warmNse();
      const headers: Record<string, string> = { "user-agent": UA, accept: "*/*" };
      if (opts.nse) { headers.referer = "https://www.nseindia.com/"; headers.cookie = nseCookie; }
      if (opts.browser) headers["user-agent"] = BROWSER_UA;
      if (opts.warm) { await warmHost(opts.warm); const c = jars.get(host); if (c) headers.cookie = c; }
      Object.assign(headers, opts.headers);
      if (opts.prev?.etag) headers["if-none-match"] = opts.prev.etag;
      if (opts.prev?.last_modified) headers["if-modified-since"] = opts.prev.last_modified;
      const res = await fetch(url, { method: opts.method ?? "GET", body: opts.body, headers, signal: AbortSignal.timeout(30_000) });
      if (res.status === 403 && opts.nse && attempt === 0) { nseCookie = ""; continue; }
      const buf = Buffer.from(await res.arrayBuffer());
      // Retry transient statuses, but hand the last response back so the caller can log its body.
      if ((res.status >= 500 || res.status === 429) && attempt < backoff.length) throw new Error(`HTTP ${res.status}`);
      return { status: res.status, buf, etag: res.headers.get("etag"), lastModified: res.headers.get("last-modified"), sha256: createHash("sha256").update(buf).digest("hex"), bytes: buf.length };
    } catch (e) {
      lastErr = e;
      if (attempt < backoff.length) await sleep(backoff[attempt]);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
