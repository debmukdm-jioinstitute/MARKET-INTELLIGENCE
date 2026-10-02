import { NIFTY_500 } from "@/lib/prowess/nifty500";
import { hfInfer } from "@/lib/hf/client";
import { getText, today } from "./http";
import { aggregateDaily, buildMatcher, filterSpam, istDay, labelsToScore, type Attributed, type DailyAggregate, type Item, type Scored, type Source } from "./sentiment-core";
import type { Collector, CollectorContext, SeriesResult } from "./types";

/**
 * Daily sentiment signals for Nifty-500 tickers from four INDEPENDENT sources.
 * Each source can fail or be skipped without affecting the others (the UI shows
 * each as its own card). Only daily aggregates are stored — never raw posts.
 *
 * Model split by register (hard rule): FinTwitBERT for social text
 * (Reddit / Telegram chatter / YouTube comments), FinBERT for formal news
 * headlines (news Telegram channels). GDELT carries its own tone score.
 * Any HF failure leaves sentiment null; mention counts still stand.
 */

const ID = "sentiment";
const WINDOW_DAYS = 2; // whole-day overlap each run, so upserts always carry complete counts for a day
const BUDGET_MS = Number(process.env.SENTIMENT_BUDGET_MS ?? 9 * 60_000);
const SCORE_CAP = Number(process.env.SENTIMENT_SCORE_CAP ?? 500);
const SOCIAL_MODEL = "StephanAkkerman/FinTwitBERT-sentiment";
const NEWS_MODEL = "ProsusAI/finbert";

/** Subreddits (verified live on Arctic Shift, 2026-10-03). Edit freely. */
export const REDDIT_SUBS = ["IndianStockMarket", "DalalStreetTalks"];

/**
 * Public Telegram channels with web previews (t.me/s/<name>), verified to serve
 * messages on 2026-10-03. EDIT THIS LIST to follow channels you trust. Only the
 * channel's own posts are visible in previews — discussion-group comments are
 * NOT, and we do not claim them. `news` channels are formal headlines (FinBERT).
 */
export const TELEGRAM_CHANNELS: { name: string; register: "social" | "news" }[] = [
  { name: "marketfeed", register: "news" },
  { name: "MoneyControlOfficial", register: "news" },
  { name: "ETMarkets", register: "news" },
  { name: "livemint", register: "news" },
  { name: "Business_Standard", register: "news" },
  { name: "Indian_Stock_Market_News", register: "news" },
  { name: "indiastockmarketnews", register: "news" },
  { name: "Finshots", register: "news" },
  { name: "indianstockmarket", register: "social" },
  { name: "stockmarketinvestingindia", register: "social" },
  { name: "nifty50_updates", register: "social" },
  { name: "tickertape", register: "social" },
  { name: "stockedgeapp", register: "social" },
  { name: "chartinkscreener", register: "social" },
];

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  Accept: "application/json,text/html,*/*",
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const decode = (s: string) => s.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

/* ------------------------------------------------------------------ */
/* Reddit via the Arctic Shift public mirror (volunteer-run, grey area) */
/* ------------------------------------------------------------------ */

type RedditRow = { created_utc?: number; author?: string; title?: string; selftext?: string; body?: string };

export function redditItems(rows: RedditRow[], kind: "posts" | "comments"): Item[] {
  const out: Item[] = [];
  for (const r of rows) {
    const text = decode(kind === "posts" ? `${r.title ?? ""} ${r.selftext ?? ""}` : (r.body ?? ""));
    if (!r.created_utc || text.length < 8 || /^\[(?:removed|deleted)\]$/.test(text)) continue;
    out.push({ source: "reddit", register: "social", text: text.slice(0, 1200), author: r.author && r.author !== "[deleted]" ? r.author : null, day: istDay(r.created_utc * 1000) });
  }
  return out;
}

async function fetchReddit(sinceMs: number, deadline: number): Promise<Item[]> {
  const items: Item[] = [];
  let reachable = 0;
  for (const sub of REDDIT_SUBS) {
    for (const kind of ["posts", "comments"] as const) {
      let after = Math.floor(sinceMs / 1000);
      for (let page = 0; page < 8 && Date.now() < deadline; page++) {
        let rows: RedditRow[];
        try {
          const txt = await getText(`https://arctic-shift.photon-reddit.com/api/${kind}/search?subreddit=${sub}&after=${after}&limit=100&sort=asc`, { headers: HEADERS, timeoutMs: 40_000, attempts: 2 });
          rows = (JSON.parse(txt) as { data?: RedditRow[] }).data ?? [];
          reachable++;
        } catch {
          break;
        }
        if (!rows.length) break;
        items.push(...redditItems(rows, kind));
        const last = rows[rows.length - 1].created_utc;
        if (!last || last <= after) break;
        after = last;
        if (rows.length < 100) break;
        await sleep(400);
      }
    }
  }
  if (!reachable) throw new Error("Arctic Shift unreachable");
  return items;
}

/* ------------------------------------------------------------------ */
/* Telegram public previews                                            */
/* ------------------------------------------------------------------ */

export type TgMessage = { id: number; text: string; iso: string | null; forwarded: boolean };

/** Parse a t.me/s/<channel> page into messages. */
export function parseTelegram(html: string): TgMessage[] {
  const out: TgMessage[] = [];
  for (const block of html.split(/<div class="tgme_widget_message_wrap/).slice(1)) {
    const id = /data-post="[^"/]+\/(\d+)"/.exec(block)?.[1];
    const text = /<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/.exec(block)?.[1];
    if (!id || !text) continue;
    out.push({ id: Number(id), text: decode(text), iso: /<time[^>]*datetime="([^"]+)"/.exec(block)?.[1] ?? null, forwarded: /tgme_widget_message_forwarded_from/.test(block) });
  }
  return out;
}

async function fetchTelegram(sinceMs: number, deadline: number): Promise<Item[]> {
  const items: Item[] = [];
  let reachable = 0;
  for (const ch of TELEGRAM_CHANNELS) {
    let before: number | null = null;
    for (let page = 0; page < 6 && Date.now() < deadline; page++) {
      let msgs: TgMessage[];
      try {
        msgs = parseTelegram(await getText(`https://t.me/s/${ch.name}${before ? `?before=${before}` : ""}`, { headers: HEADERS, timeoutMs: 25_000, attempts: 2 }));
        reachable++;
      } catch {
        break;
      }
      if (!msgs.length) break;
      let reachedOld = false;
      for (const m of msgs) {
        const t = m.iso ? Date.parse(m.iso) : NaN;
        if (Number.isNaN(t)) continue;
        if (t < sinceMs) {
          reachedOld = true;
          continue;
        }
        items.push({ source: "telegram", register: ch.register, text: m.text.slice(0, 1200), author: null, day: istDay(t), forwarded: m.forwarded });
      }
      const oldest = Math.min(...msgs.map((m) => m.id));
      if (reachedOld || oldest <= 1 || oldest === before) break;
      before = oldest;
      await sleep(500);
    }
    await sleep(400);
  }
  if (!reachable) throw new Error("Telegram previews unreachable");
  return items;
}

/* ------------------------------------------------------------------ */
/* YouTube Data API v3 (needs YOUTUBE_API_KEY; skipped without it)     */
/* ------------------------------------------------------------------ */

type YtSearch = { items?: { id?: { videoId?: string } }[] };
type YtComments = { items?: { snippet?: { topLevelComment?: { snippet?: { textDisplay?: string; publishedAt?: string; authorChannelId?: { value?: string } } } } }[] };

export function youtubeItems(symbol: string, json: YtComments): Item[] {
  const out: Item[] = [];
  for (const it of json.items ?? []) {
    const s = it.snippet?.topLevelComment?.snippet;
    const t = s?.publishedAt ? Date.parse(s.publishedAt) : NaN;
    const text = decode(s?.textDisplay ?? "");
    if (Number.isNaN(t) || text.length < 8) continue;
    out.push({ source: "youtube", register: "social", text: text.slice(0, 1000), author: s?.authorChannelId?.value ?? null, day: istDay(t), symbol });
  }
  return out;
}

async function fetchYouTube(key: string, symbols: { sym: string; name: string }[], deadline: number): Promise<Item[]> {
  const items: Item[] = [];
  let calls = 0;
  for (const { sym, name } of symbols) {
    if (Date.now() > deadline) break;
    try {
      const q = encodeURIComponent(`${name.replace(/\b(?:ltd|limited)\b\.?/gi, "").trim()} share analysis`);
      const after = new Date(Date.now() - 30 * 86_400_000).toISOString();
      const search = JSON.parse(await getText(`https://www.googleapis.com/youtube/v3/search?part=id&type=video&order=viewCount&maxResults=3&regionCode=IN&relevanceLanguage=en&publishedAfter=${after}&q=${q}&key=${encodeURIComponent(key)}`, { timeoutMs: 25_000, attempts: 1 })) as YtSearch;
      calls++;
      for (const v of (search.items ?? []).slice(0, 3)) {
        if (!v.id?.videoId) continue;
        try {
          const comments = JSON.parse(await getText(`https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${v.id.videoId}&maxResults=50&order=relevance&textFormat=plainText&key=${encodeURIComponent(key)}`, { timeoutMs: 25_000, attempts: 1 })) as YtComments;
          items.push(...youtubeItems(sym, comments));
        } catch {
          /* comments disabled on this video */
        }
      }
    } catch {
      /* one symbol failing must not stop the rest */
    }
    await sleep(250);
  }
  if (!calls) throw new Error("YouTube API unreachable or quota exhausted");
  return items;
}

/* ------------------------------------------------------------------ */
/* GDELT DOC 2.0 (news attention: raw article counts + its own tone)   */
/* ------------------------------------------------------------------ */

type GdeltTimeline = { timeline?: { series?: string; data?: { date?: string; value?: number }[] }[] };
const gdeltDay = (d?: string) => (d && /^\d{8}/.test(d) ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : null);

/** Counts (timelinevolraw) + tone (timelinetone) for one company → daily aggregates. GDELT tone (≈ −10..+10) is scaled /10 into −1..+1. */
export function gdeltAggregates(symbol: string, vol: GdeltTimeline, tone: GdeltTimeline): DailyAggregate[] {
  const counts = new Map<string, number>();
  for (const p of vol.timeline?.[0]?.data ?? []) {
    const d = gdeltDay(p.date);
    if (d && typeof p.value === "number") counts.set(d, p.value);
  }
  const tones = new Map<string, number>();
  for (const p of tone.timeline?.[0]?.data ?? []) {
    const d = gdeltDay(p.date);
    if (d && typeof p.value === "number") tones.set(d, p.value);
  }
  return [...counts]
    .filter(([, n]) => n > 0)
    .map(([day, n]) => {
      const t = tones.get(day);
      return { symbol, day, source: "gdelt" as Source, mentions: Math.round(n), sentimentMean: t === undefined ? null : Math.max(-1, Math.min(1, Math.round((t / 10) * 1000) / 1000)), bullishShare: null, scored: t === undefined ? 0 : 1, topics: null };
    });
}

async function fetchGdelt(symbols: { sym: string; name: string }[], deadline: number): Promise<DailyAggregate[]> {
  const out: DailyAggregate[] = [];
  let calls = 0;
  for (const { sym, name } of symbols) {
    if (Date.now() + 12_000 > deadline) break;
    const q = encodeURIComponent(`"${name.replace(/\b(?:ltd|limited)\b\.?/gi, "").trim()}" sourcecountry:IN`);
    try {
      const vol = JSON.parse(await getText(`https://api.gdeltproject.org/api/v2/doc/doc?query=${q}&mode=timelinevolraw&format=json&timespan=3d`, { headers: HEADERS, timeoutMs: 30_000, attempts: 1 })) as GdeltTimeline;
      calls++;
      await sleep(5_500); // GDELT: one request every 5 seconds
      const tone = JSON.parse(await getText(`https://api.gdeltproject.org/api/v2/doc/doc?query=${q}&mode=timelinetone&format=json&timespan=3d`, { headers: HEADERS, timeoutMs: 30_000, attempts: 1 })) as GdeltTimeline;
      out.push(...gdeltAggregates(sym, vol, tone));
    } catch {
      /* GDELT answers plain text when throttled; skip this symbol */
    }
    await sleep(5_500);
  }
  if (!calls) throw new Error("GDELT unreachable or throttling");
  return out;
}

/* ------------------------------------------------------------------ */
/* Scoring (strict HF)                                                 */
/* ------------------------------------------------------------------ */

type Cls = { label: string; score: number }[][];

async function scoreItems(items: Attributed[], deadline: number): Promise<{ scored: Scored[]; modelsUsed: string[] }> {
  const scored: Scored[] = items.map((i) => ({ ...i, score: null }));
  const used = new Set<string>();
  const byModel: [string, Scored[]][] = [
    [SOCIAL_MODEL, scored.filter((s) => s.register === "social")],
    [NEWS_MODEL, scored.filter((s) => s.register === "news")],
  ];
  let budget = SCORE_CAP;
  for (const [model, group] of byModel) {
    for (let i = 0; i < group.length && budget > 0 && Date.now() < deadline; i += 16) {
      const batch = group.slice(i, i + 16);
      try {
        const raw = await hfInfer<string[], Cls>(model, batch.map((b) => b.text.slice(0, 500)), { ttlMs: 3600_000, maxRetries: 2 });
        raw.forEach((cands, j) => {
          batch[j].score = labelsToScore(cands);
        });
        used.add(model);
        budget -= batch.length;
      } catch {
        break; // model unavailable: the rest of this register stays unscored (null), never rule-based
      }
    }
  }
  return { scored, modelsUsed: [...used] };
}

/* ------------------------------------------------------------------ */

async function run(ctx?: CollectorContext): Promise<SeriesResult[]> {
  const now = Date.now();
  const deadline = now + BUDGET_MS;
  const sinceMs = Date.parse(`${istDay(now - (WINDOW_DAYS - 1) * 86_400_000)}T00:00:00+05:30`);
  const universe = NIFTY_500.map((r) => ({ sym: r[0], name: r[1] }));
  const match = buildMatcher(NIFTY_500);

  const rotate = async (key: string, size: number) => {
    const cur = Number((await ctx?.watermark(key).catch(() => null)) ?? 0) || 0;
    return { cur, slice: Array.from({ length: Math.min(size, universe.length) }, (_, i) => universe[(cur + i) % universe.length]), next: (cur + size) % universe.length };
  };
  const ytKey = process.env.YOUTUBE_API_KEY;
  const yt = await rotate("sentiment:yt-cursor", Number(process.env.SENTIMENT_YT_SYMBOLS ?? 30));
  const gd = await rotate("sentiment:gdelt-cursor", Number(process.env.SENTIMENT_GDELT_SYMBOLS ?? 20));

  // Independent sources: each settles on its own.
  const [reddit, telegram, youtube, gdelt] = await Promise.allSettled([
    fetchReddit(sinceMs, deadline),
    fetchTelegram(sinceMs, deadline),
    ytKey ? fetchYouTube(ytKey, yt.slice, deadline) : Promise.reject(new Error("YOUTUBE_API_KEY not set — YouTube skipped")),
    fetchGdelt(gd.slice, deadline),
  ]);
  const status: Record<string, string> = {};
  const name = ["reddit", "telegram", "youtube", "gdelt"] as const;
  [reddit, telegram, youtube, gdelt].forEach((r, i) => {
    status[name[i]] = r.status === "fulfilled" ? "ok" : String((r as PromiseRejectedResult).reason?.message ?? "failed").slice(0, 80);
  });
  const okCount = Object.values(status).filter((s) => s === "ok").length;
  if (okCount === 0) throw new Error(`all sentiment sources failed: ${JSON.stringify(status)}`);

  const raw: Item[] = [...(reddit.status === "fulfilled" ? reddit.value : []), ...(telegram.status === "fulfilled" ? telegram.value : []), ...(youtube.status === "fulfilled" ? youtube.value : [])];
  const attributed: Attributed[] = [];
  for (const it of raw) {
    const symbols = it.symbol ? [it.symbol] : match(it.text).slice(0, 3);
    if (symbols.length) attributed.push({ ...it, symbols });
  }
  const { kept, dropped } = filterSpam(attributed);
  const { scored, modelsUsed } = await scoreItems(kept, deadline);
  const rows: DailyAggregate[] = [...aggregateDaily(scored), ...(gdelt.status === "fulfilled" ? gdelt.value : [])];

  const watermarks: Record<string, string> = { "sentiment:gdelt-cursor": String(gd.next) };
  if (ytKey && youtube.status === "fulfilled") watermarks["sentiment:yt-cursor"] = String(yt.next);

  return [
    {
      id: "sentiment_daily_rows",
      label: "Daily sentiment aggregates written this run",
      unit: "rows",
      category: "market",
      provider: "Reddit (Arctic Shift) / Telegram / YouTube / GDELT",
      url: "https://arctic-shift.photon-reddit.com/",
      obs: [{ date: today(), value: rows.length, meta: { sources: status, itemsSeen: raw.length, attributed: attributed.length, kept: kept.length, dropped, modelsUsed } }],
      records: { table: "sentiment_daily", rows: rows as unknown as Record<string, unknown>[], watermarks },
    },
  ];
}

export const sentiment: Collector = { id: ID, run, actionsOnly: true, timeoutMs: BUDGET_MS + 3 * 60_000 };
