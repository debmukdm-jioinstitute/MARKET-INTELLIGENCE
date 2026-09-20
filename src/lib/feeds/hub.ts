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
import { fetchUpstoxNews } from "@/lib/feeds/sources/upstox";
import { fetchWorldBankMacro } from "@/lib/feeds/sources/worldbank";
import { fetchMassiveUsQuotes, hasMassiveApiKey } from "@/lib/feeds/sources/massive";
import { fetchYahooQuotes } from "@/lib/feeds/sources/yahoo";
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
): LiveQuote[] {
  const map = new Map<string, LiveQuote>();
  for (const q of stooq) map.set(q.symbol, q);
  for (const q of yahoo) map.set(q.symbol, q);
  for (const q of massive) map.set(q.symbol, q);
  return [...map.values()].sort((a, b) => a.symbol.localeCompare(b.symbol));
}

export async function buildFeedHub(): Promise<FeedHubPayload> {
  const fetchedAt = new Date().toISOString();

  const tape = [...TAPE_SYMBOLS, "^VIX"];
  const [nse, bse, rbi, sec, upstoxNews, yahoo, massive, stooq, av, fred, wb, imf, oecd, mospi, biquote] =
    await Promise.all([
      timed(() => fetchNseNews()),
      timed(() => fetchBseNews()),
      timed(() => fetchRbiNews()),
      timed(() => fetchSecFilings()),
      timed(() => fetchUpstoxNews(INDIA_EQUITIES.map((i) => i.instrumentKey))),
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
    ]);

  const yahooQuotes = yahoo.value ?? [];
  const stooqQuotes = stooq.value ?? [];
  const massiveQuotes = [...(massive.value ?? []), ...(av.value ? [av.value] : [])];
  const quotes = mergeQuotes(yahooQuotes, stooqQuotes, massiveQuotes);

  const news = [
    ...(nse.value ?? []),
    ...(bse.value ?? []),
    ...(rbi.value ?? []),
    ...(sec.value ?? []),
    ...(upstoxNews.value ?? []),
  ].sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));

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
      (v) => hasMassiveApiKey() && !massive.error,
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
    health("worldbank", "World Bank", wb, (v) => Array.isArray(v) && v.length > 0),
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
        "Set MASSIVE_API_KEY on Vercel (Production) — https://massive.com/dashboard/keys";
    } else if (!massiveHealth.ok) {
      massiveHealth.message = massive.error ?? "Massive request failed";
    } else if (!(massive.value ?? []).length) {
      massiveHealth.message =
        "Connected — snapshot not on plan; Yahoo carries US tape (Massive on security detail)";
    }
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
