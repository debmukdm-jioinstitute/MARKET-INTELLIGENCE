import { getNseEquityUniverse } from "@/lib/feeds/india/universe";
import { hfInfer } from "@/lib/hf/client";
import { getText, today } from "./http";
import type { BrokerCallRow } from "./records";
import type { Collector, CollectorContext, SeriesResult } from "./types";

/**
 * Public broker calls (rating + target price) from Moneycontrol's free feeds.
 * These are the calls we happened to collect — NOT a market consensus (that is
 * paid data). Headline grammar:
 *   "Buy Petronet LNG; target of Rs 362: Motilal Oswal"
 *   summary: "... in its research report dated September 28, 2026."
 */

const ID = "broker-calls";
const FEEDS = [
  "https://www.moneycontrol.com/news/brokeragerecommendations-261.html/page-{n}/",
  "https://www.moneycontrol.com/news/broker-research-reports-13.html/page-{n}/",
];
const TONE_MODEL = "yiyanghkust/finbert-tone";
// Moneycontrol sits behind Akamai: a bare/bot UA is 403'd, full browser navigation headers are served.
const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Upgrade-Insecure-Requests": "1",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
};
const TONE_BUDGET_MS = 60_000;
const MAX_PAGES_FIRST_RUN = 6;
const MAX_PAGES_DELTA = 3;

export type ParsedCall = Omit<BrokerCallRow, "symbol" | "tone" | "toneScore"> & { articleId: number; summary: string };

/** Canonical broker names; keys are lowercase variants seen in headlines. */
const BROKER_ALIASES: Record<string, string> = {
  mofsl: "Motilal Oswal",
  "motilal oswal": "Motilal Oswal",
  "motilal oswal financial services": "Motilal Oswal",
  "icici sec": "ICICI Securities",
  "icici securities": "ICICI Securities",
  "icici direct": "ICICI Direct",
  "icicidirect": "ICICI Direct",
  "hdfc sec": "HDFC Securities",
  "hdfc securities": "HDFC Securities",
  "prabhudas lilladher": "Prabhudas Lilladher",
  "prabhudas lilladher pvt ltd": "Prabhudas Lilladher",
  "kotak securities": "Kotak Securities",
  "kotak institutional equities": "Kotak Institutional Equities",
  "emkay global": "Emkay Global",
  "emkay global financial": "Emkay Global",
  "emkay global financial services": "Emkay Global",
  sharekhan: "Sharekhan",
  "sharekhan by bnp paribas": "Sharekhan",
  "axis securities": "Axis Securities",
  "anand rathi": "Anand Rathi",
  "nirmal bang": "Nirmal Bang",
  "jm financial": "JM Financial",
  "jm financial institutional securities": "JM Financial",
  "antique stock broking": "Antique Stock Broking",
  "dolat capital": "Dolat Capital",
  "phillip capital": "PhillipCapital",
  phillipcapital: "PhillipCapital",
  "choice broking": "Choice Broking",
  "bajaj broking": "Bajaj Broking",
  "geojit financial services": "Geojit",
  geojit: "Geojit",
  "centrum broking": "Centrum Broking",
  "sbi securities": "SBI Securities",
  "sbicap securities": "SBICAP Securities",
  "systematix group": "Systematix",
  "ashika stock broking": "Ashika",
  "elara capital": "Elara Capital",
  "ambit capital": "Ambit Capital",
  "yes securities": "YES Securities",
  "lkp securities": "LKP Securities",
  "keynote capitals": "Keynote Capitals",
};

export const canonicalBroker = (raw: string): string => {
  const k = raw.trim().replace(/\s+/g, " ").toLowerCase();
  return BROKER_ALIASES[k] ?? raw.trim().replace(/\s+/g, " ");
};

const ACTION =
  "Strong Buy|Buy|Accumulate|Add|Hold|Neutral|Reduce|Sell|Strong Sell|Outperform|Underperform|Overweight|Underweight|Market Perform|Equal Weight|Positive|Negative";
const HEADLINE_RE = new RegExp(`^(${ACTION})\\s+(.+?);\\s*target(?:\\s+price)?\\s+of\\s+Rs\\.?\\s*([\\d,]+(?:\\.\\d+)?)\\s*:\\s*(.+)$`, "i");
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

export function parseReportDate(summary: string): string | null {
  const m = /report dated\s+([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/i.exec(summary);
  if (!m) return null;
  const mi = MONTHS.indexOf(m[1].toLowerCase());
  if (mi < 0) return null;
  const iso = `${m[3]}-${String(mi + 1).padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  return Number.isNaN(Date.parse(`${iso}T00:00:00Z`)) ? null : iso;
}

export function parseHeadline(title: string): { action: string; company: string; target: number; broker: string } | null {
  const m = HEADLINE_RE.exec(decode(title));
  if (!m) return null;
  const target = Number(m[3].replace(/,/g, ""));
  if (!Number.isFinite(target) || target <= 0) return null;
  const action = m[1].replace(/\b\w/g, (c) => c.toUpperCase());
  return { action, company: m[2].trim(), target, broker: canonicalBroker(m[4]) };
}

/** Parse one category page. Non-call articles (trade spotlights etc.) are skipped; calls without a parseable report date are skipped, never dated by guess. */
export function parseBrokerFeed(html: string): { calls: ParsedCall[]; articles: number } {
  const blocks = html.split(/<li class="clearfix" id="newslist-/).slice(1);
  const calls: ParsedCall[] = [];
  for (const b of blocks) {
    const url = /<a href="([^"]+)"\s+title="([^"]+)"/.exec(b);
    if (!url) continue;
    const idm = /-(\d{6,})\.html/.exec(url[1]);
    const head = parseHeadline(url[2]);
    if (!idm || !head) continue;
    const summary = decode(/<p[^>]*>([\s\S]*?)<\/p>/.exec(b)?.[1] ?? "");
    const reportDate = parseReportDate(summary);
    if (!reportDate) continue;
    calls.push({
      articleId: Number(idm[1]),
      company: head.company,
      broker: head.broker,
      action: head.action,
      targetPrice: head.target,
      reportDate,
      sourceUrl: url[1],
      summary,
    });
  }
  return { calls, articles: blocks.length };
}

const normName = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(limited|ltd|the)\b\.?/g, " ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Upstox master abbreviates names ("FIRSTSOURCE SOLU. LTD."); these tokens carry no identity. */
const NAME_NOISE = new Set(["l", "co", "ltd", "limited", "and", "c", "s"]);
const tokens = (n: string) => n.split(" ").filter((t) => t && !NAME_NOISE.has(t));
const tokenOk = (a: string, b: string) => a === b || (Math.min(a.length, b.length) >= 3 && (a.startsWith(b) || b.startsWith(a)));

/** Names whose master entry is too abbreviated to match; value is the NSE symbol (only used if it exists in the universe). null = not NSE-listed. */
const SYMBOL_ALIASES: Record<string, string | null> = {
  "mahindra and mahindra": "M&M",
  "mahindra and mahindra financial services": "M&MFIN",
  "mahindra and mahindra financial": "M&MFIN",
  "mahindra finance": "M&MFIN",
  "aditya birla sun life amc": "ABSLAMC",
  "national stock exchange": null,
  "tata motors": null, // post-demerger the name is ambiguous between TMPV (passenger) and TMCV (commercial)
};

/** Company-name → NSE symbol using the Upstox NSE instrument master. Unresolved stays null (resolved nothing, invented nothing). */
export function buildSymbolResolver(universe: { symbol: string; name: string }[]) {
  const exact = new Map<string, string | null>(); // null = several listings share the name (e.g. post-demerger twins) → unresolved
  const entries = universe.map((u) => ({ symbol: u.symbol, n: normName(u.name), t: tokens(normName(u.name)) }));
  for (const u of entries) exact.set(u.n, exact.has(u.n) ? null : u.symbol);
  const symbols = new Set(universe.map((u) => u.symbol));
  return (company: string): string | null => {
    const n = normName(company);
    if (!n) return null;
    if (n in SYMBOL_ALIASES) {
      const a = SYMBOL_ALIASES[n];
      return a && symbols.has(a) ? a : null;
    }
    if (exact.has(n)) return exact.get(n) ?? null;
    // Abbreviation-tolerant match: tokens agree pairwise (prefix either way) over the shorter name, which must have >= 2 tokens.
    const ct = tokens(n);
    if (ct.length < 2) return null;
    const cands = entries.filter((u) => {
      const k = Math.min(u.t.length, ct.length);
      return k >= 2 && Array.from({ length: k }, (_, i) => tokenOk(u.t[i], ct[i])).every(Boolean);
    });
    if (cands.length === 1) return cands[0].symbol;
    const same = cands.filter((u) => u.t.length === ct.length);
    return same.length === 1 ? same[0].symbol : null;
  };
}

type ToneRaw = { label: string; score: number }[][];

/** FinBERT-tone over headline+summary, batches of 5 (same pattern as hf/finbert.ts). Any HF failure → tone stays null; no rule-based substitute. */
async function scoreTone(calls: ParsedCall[]): Promise<Map<string, { tone: BrokerCallRow["tone"]; score: number }>> {
  const out = new Map<string, { tone: BrokerCallRow["tone"]; score: number }>();
  const deadline = Date.now() + TONE_BUDGET_MS; // stay well inside the runner's per-collector timeout; unscored rows keep tone null
  for (let i = 0; i < calls.length && Date.now() < deadline; i += 5) {
    const batch = calls.slice(i, i + 5);
    const texts = batch.map((c) => `${c.action} ${c.company}; target Rs ${c.targetPrice}: ${c.broker}. ${c.summary}`.split(/\s+/).slice(0, 400).join(" "));
    try {
      const raw = await hfInfer<string[], ToneRaw>(TONE_MODEL, texts, { ttlMs: 30 * 60_000, maxRetries: 2, cacheKey: `broker-tone::${texts.join("|")}` });
      raw.forEach((cands, j) => {
        const top = [...cands].sort((a, b) => b.score - a.score)[0];
        const label = top?.label.toLowerCase();
        if (top && (label === "positive" || label === "negative" || label === "neutral")) out.set(batch[j].sourceUrl, { tone: label, score: top.score });
      });
    } catch (e) {
      console.warn("[broker-calls] tone scoring unavailable, leaving tone null:", e instanceof Error ? e.message : e);
      break; // HF down / no token: don't burn the run on retries for every batch
    }
  }
  return out;
}

async function fetchFeed(template: string, prevId: number): Promise<{ calls: ParsedCall[]; fetched: boolean }> {
  const maxPages = prevId ? MAX_PAGES_DELTA : MAX_PAGES_FIRST_RUN;
  const calls: ParsedCall[] = [];
  let fetched = false;
  for (let n = 1; n <= maxPages; n++) {
    let html: string;
    try {
      html = await getText(template.replace("{n}", String(n)), { headers: BROWSER_HEADERS, timeoutMs: 25_000 });
    } catch (e) {
      if (n === 1) throw e;
      break; // later pages are best-effort
    }
    fetched = true;
    const page = parseBrokerFeed(html);
    calls.push(...page.calls);
    if (prevId && !page.calls.some((c) => c.articleId > prevId)) break; // reached already-ingested territory
    await new Promise((r) => setTimeout(r, 600));
  }
  return { calls, fetched };
}

async function run(ctx?: CollectorContext): Promise<SeriesResult[]> {
  const prev = (await ctx?.watermark(ID).catch(() => null)) ?? null;
  const prevId = prev && /^\d+$/.test(prev) ? Number(prev) : 0;

  const settled = await Promise.allSettled(FEEDS.map((f) => fetchFeed(f, prevId)));
  const ok = settled.filter((s): s is PromiseFulfilledResult<{ calls: ParsedCall[]; fetched: boolean }> => s.status === "fulfilled");
  if (!ok.length) {
    const reason = (settled[0] as PromiseRejectedResult).reason;
    throw new Error(`broker feeds unreachable: ${reason instanceof Error ? reason.message : String(reason)}`);
  }

  const byUrl = new Map<string, ParsedCall>();
  for (const s of ok) for (const c of s.value.calls) byUrl.set(c.sourceUrl, c);
  const all = [...byUrl.values()];
  if (!all.length) throw new Error("broker feeds returned no parseable calls — page structure may have changed");

  const fresh = all.filter((c) => c.articleId > prevId);
  const [universe, tones] = await Promise.all([
    getNseEquityUniverse().catch(() => []),
    fresh.length ? scoreTone(fresh) : Promise.resolve(new Map<string, { tone: BrokerCallRow["tone"]; score: number }>()),
  ]);
  const resolve = buildSymbolResolver(universe);

  const rows: BrokerCallRow[] = fresh.map((c) => {
    const t = tones.get(c.sourceUrl);
    return {
      symbol: resolve(c.company),
      company: c.company,
      broker: c.broker,
      action: c.action,
      targetPrice: c.targetPrice,
      reportDate: c.reportDate,
      tone: t?.tone ?? null,
      toneScore: t?.score ?? null,
      sourceUrl: c.sourceUrl,
    };
  });

  const maxId = Math.max(prevId, ...all.map((c) => c.articleId));
  return [
    {
      id: "broker_calls_feed",
      label: "Broker calls listed in Moneycontrol's public feed",
      unit: "calls",
      category: "market",
      provider: "Moneycontrol",
      url: "https://www.moneycontrol.com/news/brokeragerecommendations-261.html",
      obs: [{ date: today(), value: all.length, meta: { newThisRun: rows.length } }],
      records: { table: "broker_calls", rows: rows as unknown as Record<string, unknown>[], watermark: String(maxId) },
    },
  ];
}

export const brokerCalls: Collector = { id: ID, run, actionsOnly: true };
