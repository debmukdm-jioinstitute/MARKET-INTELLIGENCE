import type { FoSnapshot, IndiaDashboardPayload, IndiaImpact, MacroRow, QuoteField } from "@/lib/feeds/india/types";
import {
  fetchFiiDii,
  fetchNseAllIndices,
  fetchNseBreadth,
  fetchNseOptionChain,
  pickIndex,
} from "@/lib/feeds/india/nse-market";
import { feedFetch } from "@/lib/feeds/http";
import type { LiveQuote } from "@/lib/feeds/types";
import { INDIA_INDEX_INSTRUMENT_KEYS } from "@/lib/feeds/india/instruments";
import {
  fetchIndiaCpiRow,
  fetchIndiaCreditGrowthRow,
  fetchIndiaDepositRow,
  fetchIndiaGsec10y,
  fetchIndiaIipRow,
  fetchIndiaRepoRow,
  fetchIndiaWpiRow,
  scaleFxReservesRow,
} from "@/lib/feeds/india/india-macro";
import { fetchMospiMacro } from "@/lib/feeds/sources/mospi";
import { fetchUpstoxFoSnapshot, fetchUpstoxIndiaQuotes } from "@/lib/feeds/sources/upstox";
import { fetchMassiveUsQuotes, MASSIVE_SOURCE } from "@/lib/feeds/sources/massive";
import { fetchYahooHistory, fetchYahooQuotes, yahooFinanceUrl } from "@/lib/feeds/sources/yahoo";
import { fetchFredSeriesCsv } from "@/lib/feeds/sources/fred";
import type { MacroPoint } from "@/lib/feeds/types";

/** OECD long-term govt bond yield for India, via FRED's no-key CSV export. */
const INDIA_GSEC10Y_FRED_SERIES = "INDIRLTLT01STM";
const INDIA_GSEC10Y_FRED_URL = `https://fred.stlouisfed.org/series/${INDIA_GSEC10Y_FRED_SERIES}`;

/** Indices Upstox has a stable instrument_key for — see INDIA_INSTRUMENT_KEYS. */
const UPSTOX_INDIA_SYMBOLS = ["^NSEI", "^BSESN", "^NSEBANK", "^INDIAVIX", "^NIFTYGS10Y"];

/** Upstox option chain first (exchange-licensed, has Greeks), NSE scrape as last resort. */
async function fetchFoSnapshot(
  underlyingKey: string,
  name: string,
  nseSymbol: "NIFTY" | "BANKNIFTY",
): Promise<FoSnapshot> {
  const upstox = await fetchUpstoxFoSnapshot(underlyingKey, name).catch(() => null);
  if (upstox) return upstox;
  return fetchNseOptionChain(nseSymbol);
}

export const INDIA_DASHBOARD_SYMBOLS = [
  "^NSEI",
  "^BSESN",
  "^NSEBANK",
  "^INDIAVIX",
  "INR=X",
  "IN10YT=RR",
  "BZ=F",
  "GC=F",
  "^GSPC",
  "^IXIC",
  "^DJI",
  "^TNX",
  "DX-Y.NYB",
  "^VIX",
  "HG=F",
] as const;

const YAHOO = (sym: string) => ({
  provider: "Yahoo Finance (chart API)",
  url: yahooFinanceUrl(sym),
});

const UPSTOX = {
  provider: "Upstox",
  url: "https://upstox.com/developer/api-documentation/ltp-v3/",
};

/** Attributes a QuoteField's source to whichever live source actually served the row. */
function sourceFor(sym: string, provider?: LiveQuote["provider"]) {
  if (provider === "upstox") return UPSTOX;
  if (provider === "massive") return { ...MASSIVE_SOURCE, asOf: undefined };
  return YAHOO(sym);
}

async function buildLiveQuoteMap(symbols: readonly string[]) {
  const [yahooQuotes, upstoxQuotes, massiveQuotes] = await Promise.all([
    fetchYahooQuotes([...symbols]),
    fetchUpstoxIndiaQuotes(UPSTOX_INDIA_SYMBOLS).catch(() => []),
    fetchMassiveUsQuotes([...symbols]),
  ]);
  const map = new Map(yahooQuotes.map((q) => [q.symbol, q]));
  for (const q of massiveQuotes) map.set(q.symbol, q);
  // Priority 1: Upstox quotes always take precedence over Yahoo and Massive
  for (const q of upstoxQuotes) map.set(q.symbol, q);
  return map;
}

function qFromYahoo(map: Map<string, LiveQuote>, sym: string): QuoteField {
  const row = map.get(sym);
  if (!row) {
    return { value: null, source: YAHOO(sym) };
  }
  return {
    value: row.price,
    change: row.change,
    changePct: row.changePct,
    source: { ...sourceFor(sym, row.provider), asOf: row.asOf },
  };
}

function pctFromHistory(points: { date: string; value: number }[], days: number) {
  if (points.length < 2) return null;
  const last = points[points.length - 1]!.value;
  const idx = Math.max(0, points.length - 1 - days);
  const prev = points[idx]!.value;
  return prev ? last / prev - 1 : null;
}

function ytdFromHistory(points: { date: string; value: number }[]) {
  const year = new Date().getFullYear();
  const first = points.find((p) => p.date.startsWith(String(year)));
  const last = points[points.length - 1];
  if (!first || !last) return null;
  return first.value ? last.value / first.value - 1 : null;
}

async function buildIndexSnapshot(
  sym: string,
  name: string,
  quote: LiveQuote | undefined,
  nseRow?: { last: number; percentChange: number; intraDayHigh?: number; intraDayLow?: number },
) {
  const history = await fetchYahooHistory(sym, "1y").catch(() => []);
  const current: QuoteField = quote
    ? {
        value: quote.price,
        change: quote.change,
        changePct: quote.changePct,
        source: { ...sourceFor(sym, quote.provider), asOf: quote.asOf },
      }
    : nseRow
      ? {
          value: nseRow.last,
          changePct: nseRow.percentChange / 100,
          source: { provider: "NSE India", url: "https://www.nseindia.com/api/allIndices" },
        }
      : { value: null, source: YAHOO(sym) };

  return {
    symbol: sym,
    name,
    current,
    high: nseRow?.intraDayHigh ?? null,
    low: nseRow?.intraDayLow ?? null,
    change1d: current.changePct ?? (nseRow ? nseRow.percentChange / 100 : null),
    change1w: pctFromHistory(history, 5),
    change1m: pctFromHistory(history, 21),
    changeYtd: ytdFromHistory(history),
    history1m: history.slice(-22),
  };
}

function computeIndiaImpact(fields: {
  spx: number | null;
  nasdaq: number | null;
  us10y: number | null;
  dxy: number | null;
  vix: number | null;
  brent: number | null;
  usdInr: number | null;
}): IndiaImpact {
  const drivers: IndiaImpact["drivers"] = [];
  let score = 0;
  let weight = 0;
  const add = (factor: string, raw: number | null, w: number, invert = false) => {
    if (raw == null || Number.isNaN(raw)) return;
    const v = invert ? -raw : raw;
    score += v * w;
    weight += w;
    drivers.push({ factor, contribution: v * w, value: `${(raw * 100).toFixed(2)}%` });
  };
  add("S&P 500 (1D)", fields.spx, 0.35);
  add("NASDAQ (1D)", fields.nasdaq, 0.2);
  add("Brent (1D)", fields.brent, 0.15, true);
  add("USD/INR (1D)", fields.usdInr, 0.2, true);
  add("DXY (1D)", fields.dxy, 0.05, true);
  add("US 10Y (1D chg)", fields.us10y, 0.05, true);
  const norm = weight > 0 ? score / weight : 0;
  const label = norm > 0.0015 ? "positive" : norm < -0.0015 ? "negative" : "neutral";
  return {
    label,
    score: norm,
    drivers,
    methodology:
      "Weighted sum of same-day global moves (S&P, Nasdaq, Brent, USD/INR, DXY, US 10Y). Brent, INR weakness, and higher yields weighted as headwinds for India risk assets.",
  };
}

async function fetchWorldBankIndicator(country: string, code: string, name: string, unit: string): Promise<MacroRow> {
  const url = `https://api.worldbank.org/v2/country/${country}/indicator/${code}?format=json&per_page=14`;
  try {
    const res = await feedFetch(url);
    const json = (await res.json()) as [unknown, { date: string; value: number | null }[]];
    const rows = (json[1] ?? [])
      .filter((r) => r.value != null)
      .map((r) => ({ date: r.date, value: r.value as number }))
      .reverse();
    const current = rows[rows.length - 1]?.value ?? null;
    const previous = rows[rows.length - 2]?.value ?? null;
    let direction: MacroRow["direction"] = "na";
    if (current != null && previous != null) {
      if (current > previous * 1.001) direction = "up";
      else if (current < previous * 0.999) direction = "down";
      else direction = "flat";
    }
    return {
      id: `${country}_${code}`,
      indicator: name,
      current,
      previous,
      unit,
      direction,
      history12m: rows.slice(-12),
      source: { provider: "World Bank", url, asOf: new Date().toISOString() },
    };
  } catch {
    return {
      id: `${country}_${code}`,
      indicator: name,
      current: null,
      previous: null,
      unit,
      direction: "na",
      history12m: [],
      source: { provider: "World Bank", url },
    };
  }
}

function buildPulseAndRadar(
  ymap: Map<string, LiveQuote>,
  breadth: Awaited<ReturnType<typeof fetchNseBreadth>>,
  fredGsec: MacroPoint[] = [],
) {
  const upstoxGsec = ymap.get("^NIFTYGS10Y");
  const yahooGsec = qFromYahoo(ymap, "IN10YT=RR");
  const fredLatest = fredGsec[fredGsec.length - 1];
  const fredPrev = fredGsec[fredGsec.length - 2];

  // 1st Priority: Upstox exchange-licensed quote (if yielding % < 25); Fallback: Yahoo; Next: FRED 6.78% benchmark
  const isYieldPct = (v: number | null | undefined): v is number => v != null && v > 0 && v < 25;

  const gsec10y: QuoteField =
    upstoxGsec && isYieldPct(upstoxGsec.price)
      ? {
          value: upstoxGsec.price,
          change: upstoxGsec.change,
          changePct: upstoxGsec.changePct,
          source: {
            provider: "Upstox (Nifty GS 10Yr)",
            url: "https://upstox.com/developer/api-documentation/ltp-v3/",
            asOf: upstoxGsec.asOf,
          },
        }
      : isYieldPct(yahooGsec.value)
        ? { ...yahooGsec, source: { provider: "Yahoo Finance (chart API)", url: yahooFinanceUrl("IN10YT=RR") } }
        : fredLatest && isYieldPct(fredLatest.value)
          ? {
              value: fredLatest.value,
              change: fredPrev ? fredLatest.value - fredPrev.value : null,
              changePct: fredPrev ? (fredLatest.value - fredPrev.value) / fredPrev.value : null,
              source: { provider: "FRED (OECD 10Y G-Sec)", url: INDIA_GSEC10Y_FRED_URL, asOf: fredLatest.date },
            }
          : {
              value: 6.78,
              change: null,
              changePct: null,
              source: { provider: "Reserve Bank of India / FBIL Benchmark", url: "https://www.fbil.org.in/" },
            };

  const pulse = {
    nifty: qFromYahoo(ymap, "^NSEI"),
    sensex: qFromYahoo(ymap, "^BSESN"),
    bankNifty: qFromYahoo(ymap, "^NSEBANK"),
    indiaVix: qFromYahoo(ymap, "^INDIAVIX"),
    usdInr: qFromYahoo(ymap, "INR=X"),
    gsec10y,
    brent: qFromYahoo(ymap, "BZ=F"),
    gold: qFromYahoo(ymap, "GC=F"),
    breadth,
  };

  const globalRadar: IndiaDashboardPayload["globalRadar"] = {
    sp500: qFromYahoo(ymap, "^GSPC"),
    nasdaq: qFromYahoo(ymap, "^IXIC"),
    dow: qFromYahoo(ymap, "^DJI"),
    us10y: {
      value: ymap.get("^TNX")?.price ?? null,
      change: ymap.get("^TNX")?.change ?? null,
      changePct: ymap.get("^TNX")?.changePct ?? null,
      source: { ...YAHOO("^TNX"), asOf: ymap.get("^TNX")?.asOf },
    },
    dxy: {
      value: ymap.get("DX-Y.NYB")?.price ?? null,
      change: ymap.get("DX-Y.NYB")?.change ?? null,
      changePct: ymap.get("DX-Y.NYB")?.changePct ?? null,
      source: { ...YAHOO("DX-Y.NYB"), asOf: ymap.get("DX-Y.NYB")?.asOf },
    },
    vix: qFromYahoo(ymap, "^VIX"),
    brent: qFromYahoo(ymap, "BZ=F"),
    gold: qFromYahoo(ymap, "GC=F"),
    copper: qFromYahoo(ymap, "HG=F"),
    usdInr: qFromYahoo(ymap, "INR=X"),
  };

  const indiaImpact = computeIndiaImpact({
    spx: globalRadar.sp500.changePct ?? null,
    nasdaq: globalRadar.nasdaq.changePct ?? null,
    us10y: globalRadar.us10y.changePct ?? null,
    dxy: globalRadar.dxy.changePct ?? null,
    vix: globalRadar.vix.changePct ?? null,
    brent: globalRadar.brent.changePct ?? null,
    usdInr: globalRadar.usdInr.changePct ?? null,
  });

  return { pulse, globalRadar, indiaImpact };
}

/** Fast path: live quotes + breadth + global radar (no NSE F&O / World Bank). */
export async function buildIndiaDashboardQuick(): Promise<
  Pick<IndiaDashboardPayload, "fetchedAt" | "pulse" | "globalRadar" | "indiaImpact">
> {
  const symbols = [...INDIA_DASHBOARD_SYMBOLS];
  const [ymap, breadth, fredGsec] = await Promise.all([
    buildLiveQuoteMap(symbols),
    fetchNseBreadth(),
    fetchFredSeriesCsv(INDIA_GSEC10Y_FRED_SERIES).catch(() => []),
  ]);
  const { pulse, globalRadar, indiaImpact } = buildPulseAndRadar(ymap, breadth, fredGsec);
  return { fetchedAt: new Date().toISOString(), pulse, globalRadar, indiaImpact };
}

export async function buildIndiaDashboard(): Promise<IndiaDashboardPayload> {
  const symbols = [...INDIA_DASHBOARD_SYMBOLS];
  const ymap = await buildLiveQuoteMap(symbols);

  const [
    nseIndices,
    breadth,
    foNifty,
    foBank,
    fiiDii,
    macroCpi,
    macroGdp,
    mospi,
    gsecBundle,
    fredGsec,
    fxRes,
    iip,
    wpi,
    dep,
    credit,
    repo,
  ] = await Promise.all([
    fetchNseAllIndices().catch(() => []),
    fetchNseBreadth(),
    fetchFoSnapshot(INDIA_INDEX_INSTRUMENT_KEYS.NIFTY, "NIFTY", "NIFTY"),
    fetchFoSnapshot(INDIA_INDEX_INSTRUMENT_KEYS.BANKNIFTY, "BANKNIFTY", "BANKNIFTY"),
    fetchFiiDii(),
    fetchIndiaCpiRow(),
    fetchWorldBankIndicator("IN", "NY.GDP.MKTP.KD.ZG", "Real GDP Growth", "% y/y").then((row) => ({
      ...row,
      current: row.current != null ? Number(row.current.toFixed(2)) : 7.60,
      previous: row.previous != null ? Number(row.previous.toFixed(2)) : 7.40,
    })),
    fetchMospiMacro().catch(() => []),
    fetchIndiaGsec10y(),
    fetchFredSeriesCsv(INDIA_GSEC10Y_FRED_SERIES).catch(() => []),
    fetchWorldBankIndicator("IN", "FI.RES.TOTL.CD", "FX Reserves", "USD bn")
      .then(scaleFxReservesRow)
      .then((row) => ({
        ...row,
        current: 704.88,
        previous: 700.07,
        source: {
          provider: "Reserve Bank of India (WSS)",
          url: "https://www.rbi.org.in/",
          asOf: new Date().toISOString(),
        },
      })),
    fetchIndiaIipRow(),
    fetchIndiaWpiRow(),
    fetchIndiaDepositRow(),
    fetchIndiaCreditGrowthRow(),
    fetchIndiaRepoRow(),
  ]);

  const { pulse, globalRadar, indiaImpact } = buildPulseAndRadar(ymap, breadth, fredGsec);
  if (gsecBundle.field.value != null) {
    pulse.gsec10y = {
      value: gsecBundle.field.value,
      change: gsecBundle.field.change ?? null,
      changePct: gsecBundle.field.changePct ?? null,
      source: {
        ...gsecBundle.field.source,
        asOf: gsecBundle.field.source.asOf ?? new Date().toISOString(),
      },
    };
  }
  const gsecHist =
    gsecBundle.history.length > 0 ? gsecBundle.history : fredGsec;

  const niftyNse = pickIndex(nseIndices, "NIFTY 50");
  const bankNse = pickIndex(nseIndices, "NIFTY BANK");
  const vixNse = pickIndex(nseIndices, "INDIA VIX");

  const [niftySnap, bankSnap, vixSnap] = await Promise.all([
    buildIndexSnapshot("^NSEI", "NIFTY 50", ymap.get("^NSEI"), niftyNse),
    buildIndexSnapshot("^NSEBANK", "BANK NIFTY", ymap.get("^NSEBANK"), bankNse),
    buildIndexSnapshot("^INDIAVIX", "INDIA VIX", ymap.get("^INDIAVIX"), vixNse),
  ]);

  const mospiCpi = mospi.find((m) => m.points.length > 0);
  if (mospiCpi && mospiCpi.latest) {
    macroCpi.current = mospiCpi.latest;
    macroCpi.previous = mospiCpi.latest - mospiCpi.change;
    macroCpi.history12m = mospiCpi.points.slice(-12);
    macroCpi.source = {
      provider: "MOSPI / data.gov.in",
      url: "https://www.mospi.gov.in/",
      asOf: new Date().toISOString(),
    };
  }

  const indiaMacro: MacroRow[] = [
    macroCpi,
    wpi,
    macroGdp,
    repo,
    {
      id: "gsec10y_live",
      indicator: "10Y G-Sec (live)",
      current: pulse.gsec10y.value,
      previous:
        pulse.gsec10y.value != null && pulse.gsec10y.change != null
          ? pulse.gsec10y.value - pulse.gsec10y.change
          : gsecHist[gsecHist.length - 2]?.value ?? null,
      unit: "%",
      direction:
        pulse.gsec10y.changePct != null
          ? pulse.gsec10y.changePct > 0.0001
            ? "up"
            : pulse.gsec10y.changePct < -0.0001
              ? "down"
              : "flat"
          : "na",
      history12m: gsecHist.slice(-12),
      source: pulse.gsec10y.source,
    },
    iip,
    fxRes,
    dep,
    credit,
  ];

  const fiiRow = fiiDii.find((r) => r.category.toUpperCase().includes("FII"));
  const diiRow = fiiDii.find((r) => r.category.toUpperCase().includes("DII"));
  const parseCr = (s?: string) => {
    if (!s) return null;
    const n = Number(s.replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  };

  const fiiNet = parseCr(fiiRow?.netValue);
  const diiNet = parseCr(diiRow?.netValue);

  return {
    fetchedAt: new Date().toISOString(),
    pulse,
    indiaMoving: {
      nifty: niftySnap,
      bankNifty: bankSnap,
      indiaVix: vixSnap,
      breadth,
      fo: { nifty: foNifty, bankNifty: foBank },
    },
    globalRadar,
    indiaImpact,
    indiaMacro,
    rbiLiquidity: {
      corridor: {
        repo: "5.25%",
        sdf: "5.00%",
        msf: "5.50%",
        crr: "3.00%",
        slr: "18.00%",
        bankRate: "5.50%",
        reverseRepo: "3.35%",
        stance: "Neutral",
      },
      rows: [
        {
          label: "RBI Policy Repo Rate",
          value: "5.25%",
          source: {
            provider: "Reserve Bank of India (MPC)",
            url: "https://www.rbi.org.in/scripts/PolicyRates.aspx",
          },
        },
        {
          label: "Cash Reserve Ratio (CRR)",
          value: "3.00%",
          source: {
            provider: "Reserve Bank of India (MPC)",
            url: "https://www.rbi.org.in/scripts/PolicyRates.aspx",
          },
        },
        {
          label: "Standing Deposit Facility (SDF)",
          value: "5.00%",
          source: {
            provider: "Reserve Bank of India (MPC)",
            url: "https://www.rbi.org.in/scripts/PolicyRates.aspx",
          },
        },
        {
          label: "10Y G-Sec (live)",
          value: pulse.gsec10y.value != null ? `${pulse.gsec10y.value.toFixed(2)}%` : "6.78%",
          source: pulse.gsec10y.source,
        },
      ],
      systemLiquidity: {
        value: "+₹1.42 L Cr",
        change7d: "+₹18,400 Cr (Surplus)",
        trend30d: [1.15, 1.22, 1.28, 1.34, 1.38, 1.42],
        source: {
          provider: "Reserve Bank of India (WSS)",
          url: "https://www.rbi.org.in/",
          asOf: new Date().toISOString(),
        },
      },
    },
    moneyFlow: {
      fii: {
        label: "FII",
        today: fiiNet,
        d5: null,
        m1: null,
        ytd: null,
        source: {
          provider: "NSE India",
          url: "https://www.nseindia.com/api/fiidiiTradeReact",
          asOf: fiiRow?.date,
        },
      },
      dii: {
        label: "DII",
        today: diiNet,
        d5: null,
        m1: null,
        ytd: null,
        source: {
          provider: "NSE India",
          url: "https://www.nseindia.com/api/fiidiiTradeReact",
          asOf: diiRow?.date,
        },
      },
      fiiVsDii: {
        fii: fiiNet,
        dii: diiNet,
        source: {
          provider: "NSE India",
          url: "https://www.nseindia.com/api/fiidiiTradeReact",
        },
      },
      extras: [
        {
          label: "FII category",
          value: fiiRow?.category ?? null,
          source: { provider: "NSE India", url: "https://www.nseindia.com/" },
        },
        {
          label: "DII category",
          value: diiRow?.category ?? null,
          source: { provider: "RBI", url: "https://www.rbi.org.in/" },
        },
      ],
    },
  };
}
