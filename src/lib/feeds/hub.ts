import { timed } from "@/lib/feeds/http";
import { fetchAlphaVantageQuote } from "@/lib/feeds/sources/alphavantage";
import { fetchBiquoteIndices } from "@/lib/feeds/sources/biquote";
import { fetchBseNews } from "@/lib/feeds/sources/bse";
import { fetchFredMacro } from "@/lib/feeds/sources/fred";
import { fetchImfMacro } from "@/lib/feeds/sources/imf";
import { fetchMospiMacro } from "@/lib/feeds/sources/mospi";
import { fetchNseNews } from "@/lib/feeds/sources/nse";
import { fetchOecdMacro } from "@/lib/feeds/sources/oecd";
import { fetchRbiNews } from "@/lib/feeds/sources/rbi";
import { fetchSecFilings } from "@/lib/feeds/sources/sec";
import { fetchStooqQuotes } from "@/lib/feeds/sources/stooq";
import { INDIA_EQUITIES } from "@/lib/feeds/india/instruments";
import { fetchUpstoxNews, fetchUpstoxQuotes } from "@/lib/feeds/sources/upstox";
import { data360MirrorHealth } from "@/lib/data360/read-macro";
import { fetchWorldBankMacro } from "@/lib/feeds/sources/worldbank";
import { fetchMassiveUsQuotes, hasMassiveApiKey } from "@/lib/feeds/sources/massive";
import { fetchYahooQuotes } from "@/lib/feeds/sources/yahoo";
import { sortNewsByFreshness } from "@/lib/feeds/news-sort";
import type { FeedHealth, FeedHubPayload, LiveQuote } from "@/lib/feeds/types";
import { UNIVERSE } from "@/lib/universe";

const TAPE_SYMBOLS = UNIVERSE.map((u) => u.symbol);

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

function mergeQuotes(
  yahoo: LiveQuote[],
  stooq: LiveQuote[],
  massive: LiveQuote[] = [],
  upstox: LiveQuote[] = [],
): LiveQuote[] {
  const map = new Map<string, LiveQuote>();
  for (const q of stooq) map.set(q.symbol, q);
  for (const q of yahoo) map.set(q.symbol, q);
  for (const q of massive) map.set(q.symbol, q);
  // Priority 1: Upstox exchange-licensed quotes always override fallbacks
  for (const q of upstox) map.set(q.symbol, q);
  return [...map.values()].sort((a, b) => a.symbol.localeCompare(b.symbol));
}

export async function buildFeedHub(): Promise<FeedHubPayload> {
  const fetchedAt = new Date().toISOString();

  const tape = [...TAPE_SYMBOLS, "^VIX"];
  const upstoxInstruments = INDIA_EQUITIES.map((i) => ({
    instrumentKey: i.instrumentKey,
    symbol: i.symbol,
  }));

  const d360Start = Date.now();
  const [nse, bse, rbi, sec, upstoxNews, upstoxQuotes, yahoo, massive, stooq, av, fred, wb, imf, oecd, mospi, biquote, d360] =
    await Promise.all([
      timed(() => fetchNseNews()),
      timed(() => fetchBseNews()),
      timed(() => fetchRbiNews()),
      timed(() => fetchSecFilings()),
      timed(() => fetchUpstoxNews(INDIA_EQUITIES.map((i) => i.instrumentKey))),
      timed(() => fetchUpstoxQuotes(upstoxInstruments).catch(() => [])),
      timed(() => fetchYahooQuotes(tape)),
      timed(() => fetchMassiveUsQuotes(tape)),
      timed(() => fetchStooqQuotes(TAPE_SYMBOLS.slice(0, 12))),
      timed(() => fetchAlphaVantageQuote("SPY")),
      timed(() => fetchFredMacro()),
      timed(() => fetchWorldBankMacro()),
      timed(() => fetchImfMacro()),
      timed(() => fetchOecdMacro()),
      timed(() => fetchMospiMacro()),
      timed(() => fetchBiquoteIndices()),
      timed(() => data360MirrorHealth()),
    ]);

  const yahooQuotes = yahoo.value ?? [];
  const stooqQuotes = stooq.value ?? [];
  const massiveQuotes = [...(massive.value ?? []), ...(av.value ? [av.value] : [])];
  const upstoxRows = upstoxQuotes.value ?? [];
  const quotes = mergeQuotes(yahooQuotes, stooqQuotes, massiveQuotes, upstoxRows);

  const news = sortNewsByFreshness([
    ...(nse.value ?? []),
    ...(bse.value ?? []),
    ...(rbi.value ?? []),
    ...(sec.value ?? []),
    ...(upstoxNews.value ?? []),
  ]);

  const macro = [
    ...(fred.value ?? []),
    ...(wb.value ?? []),
    ...(imf.value ?? []),
    ...(oecd.value ?? []),
    ...(mospi.value ?? []).filter((m) => m.points.length > 0),
  ];

  const indices = biquote.value ?? [];

  const healthRows: FeedHealth[] = [
    health("nse", "NSE RSS", nse, (v) => Array.isArray(v) && v.length > 0),
    health("bse", "BSE RSS", bse, (v) => Array.isArray(v) && v.length > 0),
    health("rbi", "RBI RSS", rbi, (v) => Array.isArray(v) && v.length > 0),
    health("sec", "SEC EDGAR", sec, (v) => Array.isArray(v) && v.length > 0),
    health(
      "upstox",
      "Upstox news",
      upstoxNews,
      (v) => !process.env.UPSTOX_ACCESS_TOKEN || (Array.isArray(v) && v.length > 0),
    ),
    health("yahoo", "Yahoo Finance", yahoo, (v) => Array.isArray(v) && v.length > 0),
    health(
      "massive",
      "Massive (US market data)",
      massive,
      (_v) => hasMassiveApiKey() && !massive.error,
    ),
    health("stooq", "Stooq", stooq, (v) => Array.isArray(v) && v.length > 0),
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
      label: "World Bank Data360 mirror",
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
  ];

  const massiveHealth = healthRows.find((h) => h.id === "massive");
  if (massiveHealth) {
    if (!hasMassiveApiKey()) {
      massiveHealth.ok = false;
      massiveHealth.message =
        "Set MASSIVE_API_KEY on Vercel (Production) — https://massive.com/Home/keys";
    } else if (!massiveHealth.ok) {
      massiveHealth.message = massive.error ?? "Massive request failed";
    } else if (!(massive.value ?? []).length) {
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
