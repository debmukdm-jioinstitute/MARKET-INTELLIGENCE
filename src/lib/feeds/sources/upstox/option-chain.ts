import { feedFetch } from "@/lib/feeds/http";
import { UPSTOX_BASE_URL, upstoxHeaders } from "@/lib/feeds/sources/upstox/client";
import type { OptionChainRow, OptionChainSnapshot, OptionLegQuote } from "@/lib/feeds/derivatives/types";
import type { FoSnapshot } from "@/lib/feeds/india/types";

const OPTION_CHAIN_URL = `${UPSTOX_BASE_URL}/v2/option/chain`;
const OPTION_CONTRACT_URL = `${UPSTOX_BASE_URL}/v2/option/contract`;

type UpstoxOptionLeg = {
  instrument_key: string;
  market_data: {
    ltp: number;
    volume: number;
    oi: number;
    prev_oi: number;
    close_price: number;
    bid_price: number;
    bid_qty: number;
    ask_price: number;
    ask_qty: number;
  };
  option_greeks: {
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
    iv: number;
    pop: number;
  };
};

type UpstoxOptionChainRow = {
  expiry: string;
  strike_price: number;
  underlying_key: string;
  underlying_spot_price: number;
  call_options?: UpstoxOptionLeg;
  put_options?: UpstoxOptionLeg;
};

type UpstoxOptionChainResponse = {
  status: string;
  data?: UpstoxOptionChainRow[];
};

function toLegQuote(leg: UpstoxOptionLeg | undefined): OptionLegQuote | null {
  if (!leg) return null;
  return {
    instrumentKey: leg.instrument_key,
    ltp: leg.market_data.ltp ?? 0,
    volume: leg.market_data.volume ?? 0,
    oi: leg.market_data.oi ?? 0,
    prevOi: leg.market_data.prev_oi ?? 0,
    closePrice: leg.market_data.close_price ?? 0,
    bidPrice: leg.market_data.bid_price ?? 0,
    bidQty: leg.market_data.bid_qty ?? 0,
    askPrice: leg.market_data.ask_price ?? 0,
    askQty: leg.market_data.ask_qty ?? 0,
    greeks: {
      delta: leg.option_greeks?.delta ?? 0,
      gamma: leg.option_greeks?.gamma ?? 0,
      theta: leg.option_greeks?.theta ?? 0,
      vega: leg.option_greeks?.vega ?? 0,
      iv: leg.option_greeks?.iv ?? 0,
      pop: leg.option_greeks?.pop ?? 0,
    },
  };
}

/** Full strike ladder + Greeks for one underlying/expiry, one Upstox call. */
export async function fetchUpstoxOptionChain(
  underlyingKey: string,
  underlyingName: string,
  expiryDate: string,
): Promise<OptionChainSnapshot | null> {
  const headers = upstoxHeaders();
  if (!headers) return null;

  const url = `${OPTION_CHAIN_URL}?instrument_key=${encodeURIComponent(underlyingKey)}&expiry_date=${expiryDate}`;
  const res = await feedFetch(url, { headers });
  if (!res.ok) throw new Error(`Upstox option chain HTTP ${res.status}`);
  const json = (await res.json()) as UpstoxOptionChainResponse;
  if (json.status !== "success" || !json.data) return null;

  const rows: OptionChainRow[] = json.data
    .map((r) => ({
      strike: r.strike_price,
      call: toLegQuote(r.call_options),
      put: toLegQuote(r.put_options),
    }))
    .sort((a, b) => a.strike - b.strike);

  const spot = json.data[0]?.underlying_spot_price ?? 0;

  let totalCallOi = 0;
  let totalPutOi = 0;
  let changeOi = 0;
  const callStrikes: { strike: number; oi: number }[] = [];
  const putStrikes: { strike: number; oi: number }[] = [];
  for (const row of rows) {
    if (row.call) {
      totalCallOi += row.call.oi;
      changeOi += row.call.oi - row.call.prevOi;
      if (row.call.oi) callStrikes.push({ strike: row.strike, oi: row.call.oi });
    }
    if (row.put) {
      totalPutOi += row.put.oi;
      changeOi += row.put.oi - row.put.prevOi;
      if (row.put.oi) putStrikes.push({ strike: row.strike, oi: row.put.oi });
    }
  }
  callStrikes.sort((a, b) => b.oi - a.oi);
  putStrikes.sort((a, b) => b.oi - a.oi);

  // Max pain: the strike where option writers collectively lose the least.
  let maxPain: number | null = null;
  if (spot > 0 && rows.length) {
    let minPain = Number.POSITIVE_INFINITY;
    for (const k of rows.map((r) => r.strike)) {
      let pain = 0;
      for (const row of rows) {
        if (row.call && k > row.strike) pain += (k - row.strike) * row.call.oi;
        if (row.put && k < row.strike) pain += (row.strike - k) * row.put.oi;
      }
      if (pain < minPain) {
        minPain = pain;
        maxPain = k;
      }
    }
  }

  return {
    underlyingKey,
    underlyingName,
    underlyingSpot: spot,
    expiry: expiryDate,
    pcr: totalCallOi > 0 ? totalPutOi / totalCallOi : null,
    totalCallOi: totalCallOi || null,
    totalPutOi: totalPutOi || null,
    changeOi: changeOi || null,
    maxPain,
    topCallStrikes: callStrikes.slice(0, 3),
    topPutStrikes: putStrikes.slice(0, 3),
    rows,
    source: {
      provider: "Upstox",
      url: "https://upstox.com/developer/api-documentation/get-pc-option-chain/",
      asOf: new Date().toISOString(),
    },
  };
}

type UpstoxOptionContract = { expiry: string };

type UpstoxOptionContractResponse = {
  status: string;
  data?: UpstoxOptionContract[];
};

/** Unique, ascending list of expiry dates (YYYY-MM-DD) available for an underlying. */
export async function fetchUpstoxOptionExpiries(underlyingKey: string): Promise<string[]> {
  const headers = upstoxHeaders();
  if (!headers) return [];

  const url = `${OPTION_CONTRACT_URL}?instrument_key=${encodeURIComponent(underlyingKey)}`;
  const res = await feedFetch(url, { headers });
  if (!res.ok) throw new Error(`Upstox option contracts HTTP ${res.status}`);
  const json = (await res.json()) as UpstoxOptionContractResponse;
  if (json.status !== "success" || !json.data) return [];

  return [...new Set(json.data.map((c) => c.expiry))].sort();
}

/**
 * Legacy FoSnapshot-shaped summary (used by the dashboard's F&O teaser and
 * derivatives/page.tsx's NSE reference cards) — Upstox chain + nearest expiry,
 * so callers don't need to change shape. Returns null when unconfigured or
 * when the underlying has no near-term expiry, so callers can fall back to
 * the NSE scrape.
 */
export async function fetchUpstoxFoSnapshot(
  underlyingKey: string,
  underlyingName: string,
): Promise<FoSnapshot | null> {
  const headers = upstoxHeaders();
  if (!headers) return null;

  const expiries = await fetchUpstoxOptionExpiries(underlyingKey);
  const nearest = expiries[0];
  if (!nearest) return null;

  const snapshot = await fetchUpstoxOptionChain(underlyingKey, underlyingName, nearest);
  if (!snapshot) return null;

  return {
    symbol: underlyingName,
    pcr: snapshot.pcr,
    totalOi: (snapshot.totalCallOi ?? 0) + (snapshot.totalPutOi ?? 0) || null,
    changeOi: snapshot.changeOi,
    callOi: snapshot.totalCallOi,
    putOi: snapshot.totalPutOi,
    maxPain: snapshot.maxPain,
    topCallStrikes: snapshot.topCallStrikes,
    topPutStrikes: snapshot.topPutStrikes,
    source: snapshot.source,
  };
}
