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
import { fetchWorldBankMacro } from "@/lib/feeds/sources/worldbank";
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

function mergeQuotes(yahoo: LiveQuote[], stooq: LiveQuote[]): LiveQuote[] {
  const map = new Map<string, LiveQuote>();
  for (const q of stooq) map.set(q.symbol, q);
  for (const q of yahoo) map.set(q.symbol, q);
  return [...map.values()].sort((a, b) => a.symbol.localeCompare(b.symbol));
}

export async function buildFeedHub(): Promise<FeedHubPayload> {
  const fetchedAt = new Date().toISOString();

  const [nse, bse, rbi, sec, yahoo, stooq, av, fred, wb, imf, oecd, mospi, biquote] =
    await Promise.all([
      timed(() => fetchNseNews()),
      timed(() => fetchBseNews()),
      timed(() => fetchRbiNews()),
      timed(() => fetchSecFilings()),
      timed(() => fetchYahooQuotes([...TAPE_SYMBOLS, "^VIX"])),
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
  let quotes = mergeQuotes(yahooQuotes, stooqQuotes);
  if (av.value) {
    quotes = mergeQuotes(quotes, [av.value]);
  }

  const news = [
    ...(nse.value ?? []),
    ...(bse.value ?? []),
    ...(rbi.value ?? []),
    ...(sec.value ?? []),
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
    health("yahoo", "Yahoo Finance", yahoo, (v) => Array.isArray(v) && v.length > 0),
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
    health("biquote", "India live quotes", biquote, (v) => Array.isArray(v) && v.length > 0),
  ];

  return {
    fetchedAt,
    health: healthRows,
    news,
    quotes,
    macro,
    indices,
  };
}
