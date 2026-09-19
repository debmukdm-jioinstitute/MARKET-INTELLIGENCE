import { nseJson } from "@/lib/feeds/india/nse-session";
import type { BreadthSnapshot, FoSnapshot } from "@/lib/feeds/india/types";

const NSE_SOURCE = {
  provider: "NSE India",
  url: "https://www.nseindia.com/",
};

type IndexRow = {
  index: string;
  last: number;
  variation: number;
  percentChange: number;
  yearHigh?: number;
  yearLow?: number;
  intraDayHigh?: number;
  intraDayLow?: number;
};

export async function fetchNseAllIndices(): Promise<IndexRow[]> {
  const json = await nseJson<{ data?: IndexRow[] }>("/api/allIndices");
  return json.data ?? [];
}

export function pickIndex(rows: IndexRow[], name: string) {
  return rows.find((r) => r.index.toUpperCase().includes(name.toUpperCase()));
}

type StockRow = {
  symbol: string;
  lastPrice: number;
  pChange: number;
  yearHigh: number;
  yearLow: number;
};

export async function fetchNseBreadth(): Promise<BreadthSnapshot> {
  try {
    const json = await nseJson<{ data?: StockRow[] }>(
      "/api/equity-stockIndices?index=NIFTY%20500",
    );
    const stocks = json.data ?? [];
    let advances = 0;
    let declines = 0;
    let unchanged = 0;
    let high52w = 0;
    let low52w = 0;
    for (const s of stocks) {
      if (s.pChange > 0.05) advances += 1;
      else if (s.pChange < -0.05) declines += 1;
      else unchanged += 1;
      if (s.yearHigh > 0 && s.lastPrice >= s.yearHigh * 0.995) high52w += 1;
      if (s.yearLow > 0 && s.lastPrice <= s.yearLow * 1.005) low52w += 1;
    }
    return {
      advances: stocks.length ? advances : null,
      declines: stocks.length ? declines : null,
      unchanged: stocks.length ? unchanged : null,
      high52w: stocks.length ? high52w : null,
      low52w: stocks.length ? low52w : null,
      source: {
        ...NSE_SOURCE,
        url: "https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%20500",
      },
    };
  } catch {
    return {
      advances: null,
      declines: null,
      unchanged: null,
      high52w: null,
      low52w: null,
      source: NSE_SOURCE,
    };
  }
}

type OptionLeg = {
  strikePrice: number;
  openInterest: number;
  changeinOpenInterest: number;
};

type OptionChain = {
  records?: {
    data?: {
      CE?: OptionLeg;
      PE?: OptionLeg;
    }[];
    expiryDates?: string[];
    underlyingValue?: number;
  };
};

function parseOptionChain(symbol: string, json: OptionChain): FoSnapshot {
  const rows = json.records?.data ?? [];
  let callOi = 0;
  let putOi = 0;
  let changeOi = 0;
  const callStrikes: { strike: number; oi: number }[] = [];
  const putStrikes: { strike: number; oi: number }[] = [];

  for (const row of rows) {
    const ce = row.CE;
    const pe = row.PE;
    if (ce) {
      callOi += ce.openInterest ?? 0;
      changeOi += ce.changeinOpenInterest ?? 0;
      if (ce.openInterest) callStrikes.push({ strike: ce.strikePrice, oi: ce.openInterest });
    }
    if (pe) {
      putOi += pe.openInterest ?? 0;
      changeOi += pe.changeinOpenInterest ?? 0;
      if (pe.openInterest) putStrikes.push({ strike: pe.strikePrice, oi: pe.openInterest });
    }
  }

  callStrikes.sort((a, b) => b.oi - a.oi);
  putStrikes.sort((a, b) => b.oi - a.oi);

  const spot = json.records?.underlyingValue ?? 0;
  let maxPain: number | null = null;
  if (spot > 0 && rows.length) {
    const strikes = [...new Set(rows.flatMap((r) => [r.CE?.strikePrice, r.PE?.strikePrice].filter(Boolean)))].sort(
      (a, b) => (a as number) - (b as number),
    ) as number[];
    let minPain = Number.POSITIVE_INFINITY;
    for (const k of strikes) {
      let pain = 0;
      for (const row of rows) {
        const ce = row.CE;
        const pe = row.PE;
        if (ce && k > ce.strikePrice) pain += (k - ce.strikePrice) * ce.openInterest;
        if (pe && k < pe.strikePrice) pain += (pe.strikePrice - k) * pe.openInterest;
      }
      if (pain < minPain) {
        minPain = pain;
        maxPain = k;
      }
    }
  }

  return {
    symbol,
    pcr: callOi > 0 ? putOi / callOi : null,
    totalOi: callOi + putOi || null,
    changeOi: changeOi || null,
    callOi: callOi || null,
    putOi: putOi || null,
    maxPain,
    topCallStrikes: callStrikes.slice(0, 3),
    topPutStrikes: putStrikes.slice(0, 3),
    source: {
      provider: "NSE India",
      url: `https://www.nseindia.com/api/option-chain-indices?symbol=${symbol}`,
    },
  };
}

export async function fetchNseOptionChain(symbol: "NIFTY" | "BANKNIFTY"): Promise<FoSnapshot> {
  try {
    const json = await nseJson<OptionChain>(`/api/option-chain-indices?symbol=${symbol}`);
    return parseOptionChain(symbol, json);
  } catch {
    return {
      symbol,
      pcr: null,
      totalOi: null,
      changeOi: null,
      callOi: null,
      putOi: null,
      maxPain: null,
      topCallStrikes: [],
      topPutStrikes: [],
      source: {
        provider: "NSE India",
        url: `https://www.nseindia.com/option-chain`,
      },
    };
  }
}

type FiiDiiRow = {
  category: string;
  date: string;
  buyValue: string;
  sellValue: string;
  netValue: string;
};

export async function fetchFiiDii(): Promise<FiiDiiRow[]> {
  try {
    const json = await nseJson<FiiDiiRow[]>("/api/fiidiiTradeReact");
    return Array.isArray(json) ? json : [];
  } catch {
    return [];
  }
}
