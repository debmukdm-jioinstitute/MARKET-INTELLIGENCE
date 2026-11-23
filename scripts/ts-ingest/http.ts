import { constants, createHash } from "node:crypto";
import { Agent } from "undici";
import {
  cookiePairsFromResponse,
  mergeCookieHeader,
  stripPoisonCookies,
} from "@/lib/feeds/cookie-jar";

const legacyDispatcher = new Agent({
  connect: {
    secureOptions: constants.SSL_OP_LEGACY_SERVER_CONNECT,
    ciphers: "DEFAULT@SECLEVEL=1",
  },
});

const UA = "Mozilla/5.0 (MarketIntelligence)";
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

/** True when a body is an HTML page (soft-404 / WAF / error page) rather than data. */
export const looksLikeHtml = (buf: Buffer): boolean => /^\s*(<!doctype html|<html|<head|<body)/i.test(buf.subarray(0, 200).toString("utf8"));
export const bodyHead = (buf: Buffer, n = 400): string => buf.subarray(0, n).toString("utf8").replace(/\s+/g, " ").trim();

const jars = new Map<string, string>();
async function warmHost(warmUrl: string) {
  const host = new URL(warmUrl).host;
  if (jars.has(host)) return;
  try {
    const r = await fetch(warmUrl, {
      headers: { "user-agent": BROWSER_UA, accept: "text/html,*/*" },
      signal: AbortSignal.timeout(8_000),
    });
    const set = cookiePairsFromResponse(r);
    const merged = stripPoisonCookies(mergeCookieHeader(undefined, set));
    if (merged) jars.set(host, merged);
    else jars.set(host, "");
  } catch {
    jars.set(host, "");
  }
}
const lastHit = new Map<string, number>();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type Fetched = { status: number; contentType: string | null; server: string | null; buf: Buffer; etag: string | null; lastModified: string | null; sha256: string; bytes: number };

let nseCookie = "";
let nseWarmAttempted = false;

async function warmNse() {
  if (nseWarmAttempted) return;
  nseWarmAttempted = true;
  try {
    const r = await fetch("https://www.nseindia.com/", {
      headers: {
        "user-agent": BROWSER_UA,
        accept: "text/html,*/*",
        "accept-language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(8_000),
    });
    const merged = stripPoisonCookies(mergeCookieHeader(nseCookie || undefined, cookiePairsFromResponse(r)));
    nseCookie = merged ?? "";
  } catch {
    /* API calls often succeed without homepage cookies; never block ingest on warmup. */
  }
}

function mergeNseCookies(res: Response) {
  const merged = stripPoisonCookies(mergeCookieHeader(nseCookie || undefined, cookiePairsFromResponse(res)));
  if (merged) nseCookie = merged;
}

/** Polite fetch: >=1 s per host, 30 s timeout, 3 retries (2/8/30 s). NSE tries the API first, warms cookies only on 403/timeout, and never attaches Akamai bot-manager cookies. Returns the final response; never throws on HTTP status. */
export async function politeFetch(url: string, opts: { nse?: boolean; warm?: string; browser?: boolean; method?: string; body?: string; headers?: Record<string, string>; prev?: { etag?: string | null; last_modified?: string | null } } = {}): Promise<Fetched> {
  const host = new URL(url).host;
  const backoff = [2000, 8000, 30000];
  let lastErr: unknown;
  for (let attempt = 0; attempt <= backoff.length; attempt++) {
    const wait = (lastHit.get(host) ?? 0) + 1000 - Date.now();
    if (wait > 0) await sleep(wait);
    lastHit.set(host, Date.now());
    try {
      const headers: Record<string, string> = { "user-agent": UA, accept: "*/*" };
      if (opts.nse) {
        headers["user-agent"] = BROWSER_UA;
        headers.referer = "https://www.nseindia.com/";
        headers.origin = "https://www.nseindia.com";
        headers["accept-language"] = "en-US,en;q=0.9";
        if (nseCookie) headers.cookie = nseCookie;
      }
      if (opts.browser) headers["user-agent"] = BROWSER_UA;
      if (opts.warm) { await warmHost(opts.warm); const c = jars.get(host); if (c) headers.cookie = c; }
      Object.assign(headers, opts.headers);
      if (opts.prev?.etag) headers["if-none-match"] = opts.prev.etag;
      if (opts.prev?.last_modified) headers["if-modified-since"] = opts.prev.last_modified;
      const fetchOpts: RequestInit = { method: opts.method ?? "GET", body: opts.body, headers, signal: AbortSignal.timeout(30_000) };
      if (host === "api.mospi.gov.in" || (opts as { legacySsl?: boolean }).legacySsl) {
        // @ts-expect-error undici dispatcher
        fetchOpts.dispatcher = legacyDispatcher;
      }
      const res = await fetch(url, fetchOpts);
      if (opts.nse) mergeNseCookies(res);
      if (res.status === 403 && opts.nse && attempt === 0) {
        nseCookie = "";
        nseWarmAttempted = false;
        await warmNse();
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      // Retry transient statuses, but hand the last response back so the caller can log its body.
      if ((res.status >= 500 || res.status === 429) && attempt < backoff.length) throw new Error(`HTTP ${res.status}`);
      return { status: res.status, contentType: res.headers.get("content-type"), server: res.headers.get("server"), buf, etag: res.headers.get("etag"), lastModified: res.headers.get("last-modified"), sha256: createHash("sha256").update(buf).digest("hex"), bytes: buf.length };
    } catch (e) {
      lastErr = e;
      if (opts.nse && nseCookie) {
        // Cookies from a "successful" HTML warmup can stall /api/* until timeout — drop them and retry bare.
        nseCookie = "";
      } else if (opts.nse && !nseWarmAttempted) {
        await warmNse();
      }
      if (attempt < backoff.length) await sleep(backoff[attempt]);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

/** Test hook — do not use in production ingest. */
export function __resetNseIngestSessionForTests() {
  nseCookie = "";
  nseWarmAttempted = false;
  jars.clear();
}
