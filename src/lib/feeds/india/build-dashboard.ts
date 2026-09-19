import type { IndiaDashboardPayload, IndiaImpact, MacroRow, QuoteField } from "@/lib/feeds/india/types";
import {
  fetchFiiDii,
  fetchNseAllIndices,
  fetchNseBreadth,
  fetchNseOptionChain,
  pickIndex,
} from "@/lib/feeds/india/nse-market";
import { feedFetch } from "@/lib/feeds/http";
import type { LiveQuote } from "@/lib/feeds/types";
import { fetchMospiMacro } from "@/lib/feeds/sources/mospi";
import { fetchYahooHistory, fetchYahooQuotes, yahooFinanceUrl } from "@/lib/feeds/sources/yahoo";

const YAHOO = (sym: string) => ({
  provider: "Yahoo Finance",
  url: yahooFinanceUrl(sym),
});

function qFromYahoo(map: Map<string, LiveQuote>, sym: string): QuoteField {
  const row = map.get(sym);
  if (!row) {
    return { value: null, source: YAHOO(sym) };
  }
  return {
    value: row.price,
    change: row.change,
    changePct: row.changePct,
    source: { ...YAHOO(sym), asOf: row.asOf },
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

async function buildIndexSnapshot(sym: string, name: string, nseRow?: { last: number; percentChange: number; intraDayHigh?: number; intraDayLow?: number }) {
  const history = await fetchYahooHistory(sym, "1y").catch(() => []);
  const yahooQ = await fetchYahooQuotes([sym]).catch(() => []);
  const y = yahooQ[0];
  const current: QuoteField = y
    ? {
        value: y.price,
        change: y.change,
        changePct: y.changePct,
        source: { ...YAHOO(sym), asOf: y.asOf },
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
      source: { provider: "World Bank", url },
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

export async function buildIndiaDashboard(): Promise<IndiaDashboardPayload> {
  const symbols = [
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
  ];
  const [yahooQuotes, nseIndices, breadth, foNifty, foBank, fiiDii, macroCpi, macroGdp, mospi, gsecHist, fxRes, iip] =
    await Promise.all([
      fetchYahooQuotes(symbols).catch(() => []),
      fetchNseAllIndices().catch(() => []),
      fetchNseBreadth(),
      fetchNseOptionChain("NIFTY"),
      fetchNseOptionChain("BANKNIFTY"),
      fetchFiiDii(),
      fetchWorldBankIndicator("IN", "FP.CPI.TOTL.ZG", "CPI", "% y/y"),
      fetchWorldBankIndicator("IN", "NY.GDP.MKTP.KD.ZG", "GDP Growth", "% y/y"),
      fetchMospiMacro().catch(() => []),
      fetchYahooHistory("IN10YT=RR", "1y").catch(() => []),
      fetchWorldBankIndicator("IN", "FI.RES.TOTL.CD", "FX Reserves", "USD bn"),
      fetchWorldBankIndicator("IN", "NV.IND.MANF.KD.ZG", "IIP / Mfg growth", "% y/y"),
    ]);

  const ymap = new Map(yahooQuotes.map((q) => [q.symbol, q]));
  const niftyNse = pickIndex(nseIndices, "NIFTY 50");
  const bankNse = pickIndex(nseIndices, "NIFTY BANK");
  const vixNse = pickIndex(nseIndices, "INDIA VIX");

  const [niftySnap, bankSnap, vixSnap] = await Promise.all([
    buildIndexSnapshot("^NSEI", "NIFTY 50", niftyNse),
    buildIndexSnapshot("^NSEBANK", "BANK NIFTY", bankNse),
    buildIndexSnapshot("^INDIAVIX", "INDIA VIX", vixNse),
  ]);

  const pulse = {
    nifty: qFromYahoo(ymap, "^NSEI"),
    sensex: qFromYahoo(ymap, "^BSESN"),
    bankNifty: qFromYahoo(ymap, "^NSEBANK"),
    indiaVix: qFromYahoo(ymap, "^INDIAVIX"),
    usdInr: qFromYahoo(ymap, "INR=X"),
    gsec10y: {
      ...qFromYahoo(ymap, "IN10YT=RR"),
      source: { provider: "Yahoo Finance", url: yahooFinanceUrl("IN10YT=RR") },
    },
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
      changePct: ymap.get("^TNX")?.changePct ?? null,
      source: YAHOO("^TNX"),
    },
    dxy: {
      value: ymap.get("DX-Y.NYB")?.price ?? null,
      changePct: ymap.get("DX-Y.NYB")?.changePct ?? null,
      source: YAHOO("DX-Y.NYB"),
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

  const repo = await fetchWorldBankIndicator("IN", "FR.INR.LEND", "Repo / lending (WB)", "%");
  const mospiCpi = mospi.find((m) => m.points.length > 0);
  if (mospiCpi && mospiCpi.latest) {
    macroCpi.current = mospiCpi.latest;
    macroCpi.previous = mospiCpi.latest - mospiCpi.change;
    macroCpi.history12m = mospiCpi.points.slice(-12);
    macroCpi.source = {
      provider: "MOSPI / data.gov.in",
      url: "https://www.mospi.gov.in/",
    };
  }

  const indiaMacro: MacroRow[] = [
    macroCpi,
    await fetchWorldBankIndicator("IN", "FP.WPI.TOTL.ZG", "WPI", "% y/y"),
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
    await fetchWorldBankIndicator("IN", "FR.INR.DPST.GD.ZS", "Deposit / GDP proxy", "%"),
    await fetchWorldBankIndicator("IN", "FR.INR.TOTL.ZG", "Credit growth", "% y/y"),
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
      rows: [
        {
          label: "Policy / lending (World Bank)",
          value: repo.current != null ? `${repo.current.toFixed(2)}%` : null,
          source: repo.source,
        },
        {
          label: "10Y G-Sec (Yahoo)",
          value: pulse.gsec10y.value != null ? `${pulse.gsec10y.value.toFixed(2)}%` : null,
          source: pulse.gsec10y.source,
        },
      ],
      systemLiquidity: {
        value: null,
        change7d: null,
        trend30d: [],
        source: {
          provider: "RBI",
          url: "https://www.rbi.org.in/",
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
