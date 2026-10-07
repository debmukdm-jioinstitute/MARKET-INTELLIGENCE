import { timed } from "@/lib/feeds/http";
import { fetchAlphaVantageQuote } from "@/lib/feeds/sources/alphavantage";
import { fetchBiquoteIndices } from "@/lib/feeds/sources/biquote";
import { fetchBseNewsWithOrigin } from "@/lib/feeds/sources/bse";
import { fetchFredMacro } from "@/lib/feeds/sources/fred";
import { fetchGoogleNewsIndiaMacro } from "@/lib/feeds/sources/google-news-india";
import { fetchImfMacro } from "@/lib/feeds/sources/imf";
import { fetchMospiMacro } from "@/lib/feeds/sources/mospi";
import { fetchNseNews } from "@/lib/feeds/sources/nse";
import { fetchOecdMacro } from "@/lib/feeds/sources/oecd";
import { fetchOpenPublisherRss } from "@/lib/feeds/sources/open-news-rss";
import { fetchRbiNews } from "@/lib/feeds/sources/rbi";
import { fetchRedditCommunityNews } from "@/lib/feeds/sources/reddit";
import { fetchSecFilings } from "@/lib/feeds/sources/sec";
import { fetchUpstoxNews } from "@/lib/feeds/sources/upstox";
import { getQuotes, type QuoteSourceStatus } from "@/lib/feeds/quotes";
import { INDIA_EQUITIES } from "@/lib/feeds/india/instruments";
import { data360MirrorHealth } from "@/lib/data360/read-macro";
import { fetchWorldBankMacro } from "@/lib/feeds/sources/worldbank";
import { hasMassiveApiKey } from "@/lib/feeds/sources/massive";
import { openCommunityNewsEnabled } from "@/lib/feeds/open-news-config";
import { sortNewsByFreshness } from "@/lib/feeds/news-sort";
import type { FeedHealth, FeedHubPayload } from "@/lib/feeds/types";
import { UNIVERSE } from "@/lib/universe";

const TAPE_SYMBOLS = UNIVERSE.map((u) => u.symbol);
const INDIA_TAPE_SYMBOLS = INDIA_EQUITIES.map((i) => `${i.symbol}.NS`);

function health(
  id: FeedHealth["id"],
  label: string,
  result: { value?: unknown; error?: string; latencyMs: number },
  okWhen?: (v: unknown) => boolean,
): FeedHealth {
  const ok = result.error
    ? false
    : okWhen
      ? okWhen(result.value)
      : result.value !== undefined;
  return {
    id,
    label,
    ok,
    latencyMs: result.latencyMs,
    message: result.error ?? (ok ? "ok" : "no data"),
    updatedAt: new Date().toISOString(),
  };
}

export async function buildFeedHub(): Promise<FeedHubPayload> {
  const fetchedAt = new Date().toISOString();

  const tape = [...TAPE_SYMBOLS, ...INDIA_TAPE_SYMBOLS, "^VIX"];

  const d360Start = Date.now();
  const openNewsOn = openCommunityNewsEnabled();
  const [nse, bse, rbi, sec, upstoxNews, quoteBundle, av, fred, wb, imf, oecd, mospi, biquote, d360, openRss, reddit, googleMacro] =
    await Promise.all([
      timed(() => fetchNseNews()),
      timed(() => fetchBseNewsWithOrigin()),
      timed(() => fetchRbiNews()),
      timed(() => fetchSecFilings()),
      timed(() => fetchUpstoxNews(INDIA_EQUITIES.map((i) => i.instrumentKey))),
      // Unified quote service: Upstox (official) > Massive > Yahoo v7 batch >
      // Stooq, each internally batched — ~5 upstream requests for the whole
      // tape instead of ~100 one-per-symbol calls.
      timed(() => getQuotes(tape)),
      timed(() => fetchAlphaVantageQuote("SPY")),
      timed(() => fetchFredMacro()),
      timed(() => fetchWorldBankMacro()),
      timed(() => fetchImfMacro()),
      timed(() => fetchOecdMacro()),
      timed(() => fetchMospiMacro()),
      timed(() => fetchBiquoteIndices()),
      timed(() => data360MirrorHealth()),
      timed(() => (openNewsOn ? fetchOpenPublisherRss() : Promise.resolve([]))),
      timed(() => (openNewsOn ? fetchRedditCommunityNews() : Promise.resolve([]))),
      timed(() => (openNewsOn ? fetchGoogleNewsIndiaMacro() : Promise.resolve([]))),
    ]);

  const bundle = quoteBundle.value;
  const srcStatus = new Map<string, QuoteSourceStatus>(
    (bundle?.sources ?? []).map((s) => [s.id, s]),
  );
  const quoteResults = bundle?.quotes ?? [];
  // Stale quotes (served from persisted last-good when all live sources fail)
  // are real delayed data — keep them, labeled via quote.stale.
  const quoteMap = new Map(quoteResults.map((r) => [r.quote.symbol, r.quote]));
  for (const r of quoteResults) {
    if (r.quote.symbol.endsWith(".NS")) {
      const bare = r.quote.symbol.replace(/\.NS$/, "");
      if (!quoteMap.has(bare)) {
        quoteMap.set(bare, { ...r.quote, symbol: bare });
      }
    }
  }
  // Alpha Vantage SPY snapshot keeps its old slot: above Yahoo/Massive, below
  // Upstox (Upstox doesn't cover SPY, so this is a pure overlay).
  if (av.value) quoteMap.set(av.value.symbol, av.value);
  const quotes = [...quoteMap.values()].sort((a, b) => a.symbol.localeCompare(b.symbol));

  const news = sortNewsByFreshness([
    ...(nse.value ?? []),
    ...(bse.value?.items ?? []),
    ...(rbi.value ?? []),
    ...(sec.value ?? []),
    ...(upstoxNews.value ?? []),
    ...(openRss.value ?? []),
    ...(reddit.value ?? []),
    ...(googleMacro.value ?? []),
  ]).slice(0, 120);

  const macro = [
    ...(fred.value ?? []),
    ...(wb.value ?? []),
    ...(imf.value ?? []),
    ...(oecd.value ?? []),
    ...(mospi.value ?? []).filter((m) => m.points.length > 0),
  ];

  const indices = biquote.value ?? [];

  // Per-source quote health comes from the unified quote bundle (each source
  // is still fetched — just batched — so health stays per-source).
  const qs = (id: string) => {
    const s = srcStatus.get(id);
    return {
      value: s && s.count > 0 ? new Array(s.count).fill(0) : [],
      error: s?.error,
      latencyMs: s?.latencyMs ?? 0,
    };
  };
  const healthRows: FeedHealth[] = [
    // NSE's own RSS URLs are dead (404); this row is Google News, so say so.
    health("nse", "NSE news (Google News fallback)", nse, (v) => Array.isArray(v) && v.length > 0),
    health(
      "bse",
      bse.value?.via === "fallback" ? "BSE RSS (Google News fallback)" : "BSE RSS",
      bse,
      () => (bse.value?.items.length ?? 0) > 0,
    ),
    health("rbi", "RBI RSS", rbi, (v) => Array.isArray(v) && v.length > 0),
    health("sec", "SEC EDGAR", sec, (v) => Array.isArray(v) && v.length > 0),
    health(
      "upstox",
      "Upstox news",
      upstoxNews,
      (v) => !process.env.UPSTOX_ACCESS_TOKEN || (Array.isArray(v) && v.length > 0),
    ),
    health("yahoo", "Yahoo Finance", qs("yahoo"), (v) => Array.isArray(v) && v.length > 0),
    health(
      "massive",
      "Massive (US market data)",
      qs("massive"),
      (_v) => hasMassiveApiKey() && !qs("massive").error,
    ),
    health("stooq", "Stooq", qs("stooq"), (v) => Array.isArray(v) && v.length > 0),
    health(
      "alphavantage",
      "Alpha Vantage",
      av,
      (v) => v !== null || !process.env.ALPHA_VANTAGE_API_KEY,
    ),
    health(
      "fred",
      "FRED",
      fred,
      (v) => Array.isArray(v) && (v.length > 0 || !process.env.FRED_API_KEY),
    ),
    health("worldbank", "World Bank (live API)", wb, (v) => Array.isArray(v) && v.length > 0),
    {
      id: "data360",
      label: "World Bank Data360 (stored)",
      ok: Boolean(d360.value?.ok) && !d360.error,
      latencyMs: d360.latencyMs || Date.now() - d360Start,
      message: d360.value
        ? `${d360.value.observations.toLocaleString()} obs · ${d360.value.pending} cursors pending`
        : d360.error,
      updatedAt: new Date().toISOString(),
    },
    health("imf", "IMF Data", imf, (v) => Array.isArray(v) && v.length > 0),
    health("oecd", "OECD Data", oecd, (v) => Array.isArray(v) && v.length > 0),
    health("mospi", "MOSPI / data.gov.in", mospi, (v) => Array.isArray(v) && v.some((m) => m.points.length)),
    health(
      "biquote",
      "India live quotes (Upstox/Yahoo/TrueData)",
      biquote,
      (v) => Array.isArray(v) && v.length > 0,
    ),
    health(
      "reddit",
      "Reddit (community)",
      reddit,
      (v) => !openNewsOn || (Array.isArray(v) && v.length > 0),
    ),
    health(
      "livemint",
      "LiveMint RSS",
      { value: openRss.value?.filter((n) => n.source === "livemint"), latencyMs: openRss.latencyMs, error: openRss.error },
      (v) => !openNewsOn || (Array.isArray(v) && v.length > 0),
    ),
    health(
      "moneycontrol",
      "Moneycontrol RSS",
      {
        value: openRss.value?.filter((n) => n.source === "moneycontrol"),
        latencyMs: openRss.latencyMs,
        error: openRss.error,
      },
      (v) => !openNewsOn || (Array.isArray(v) && v.length > 0),
    ),
    health(
      "googlenews",
      "Google News (India macro)",
      googleMacro,
      (v) => !openNewsOn || (Array.isArray(v) && v.length > 0),
    ),
  ];

  const massiveHealth = healthRows.find((h) => h.id === "massive");
  const massiveSrc = srcStatus.get("massive");
  if (massiveHealth) {
    if (!hasMassiveApiKey()) {
      massiveHealth.ok = false;
      massiveHealth.message =
        "Set MASSIVE_API_KEY on Vercel (Production) — https://massive.com/Home/keys";
    } else if (!massiveHealth.ok) {
      massiveHealth.message = massiveSrc?.error ?? "Massive request failed";
    } else if (!massiveSrc?.count) {
      massiveHealth.message =
        "Connected — snapshot not on plan; Yahoo carries US tape (Massive on security detail)";
    }
  }

  const stooqHealth = healthRows.find((h) => h.id === "stooq");
  if (stooqHealth && !stooqHealth.ok) {
    stooqHealth.ok = true;
    stooqHealth.message = "Standby fallback — Yahoo & Upstox carry primary tape";
  }

  return {
    fetchedAt,
    health: healthRows,
    news,
    quotes,
    macro,
    indices,
  };
}
