import { mean } from "@/lib/analytics";
import { findIndiaInstrument } from "@/lib/feeds/india/instruments";
import { candleRangeToDates, fetchUpstoxHistoricalCandles } from "@/lib/feeds/sources/upstox/candles";
import { fetchUpstoxCorporateActions, upcomingCorporateActions } from "@/lib/feeds/sources/upstox/corporate-actions";
import { fetchUpstoxOptionChain, fetchUpstoxOptionExpiries } from "@/lib/feeds/sources/upstox/option-chain";
import type { ActiveStrikeOiChange, OptionsFlowRecord, SourcedField } from "@/lib/options-flow/types";

/**
 * The Data Agent. Per the doc, its only job is gathering — it never analyzes
 * and never makes recommendations. Every figure below carries its own source
 * and timestamp, or is explicitly marked unavailable; nothing is estimated
 * and no gap is filled with a prior value.
 */

function ok<T>(value: T, provider: string, url: string, asOf: string): SourcedField<T> {
  return { status: "ok", value, source: { provider, url, asOf } };
}

function unavailable(reason: string): SourcedField<never> {
  return { status: "unavailable", reason };
}

const UPSTOX_CANDLES_URL = "https://upstox.com/developer/api-documentation/get-historical-candle-data/";
const UPSTOX_CORP_ACTIONS_URL = "https://upstox.com/developer/api-documentation/get-corporate-actions/";

export async function gatherOptionsFlowRecord(symbol: string, date?: string): Promise<OptionsFlowRecord> {
  const instrument = findIndiaInstrument(symbol);
  if (!instrument) throw new Error(`${symbol} is not in the curated F&O watchlist for this screener`);

  const snapshotDate = date ?? new Date().toISOString().slice(0, 10);
  const fetchedAt = new Date().toISOString();

  // -- Price + volume, 90 trading days -------------------------------------
  const { from, to } = candleRangeToDates("3M");
  const candles = await fetchUpstoxHistoricalCandles(instrument.instrumentKey, "days", "1", from, to).catch(
    () => [],
  );

  let price: SourcedField<number> = unavailable("Upstox not configured or returned no candle data");
  let priceChangePct: SourcedField<number> = unavailable("Upstox not configured or returned no candle data");
  let volume: SourcedField<number> = unavailable("Upstox not configured or returned no candle data");
  let volumeAvg30: SourcedField<number> = unavailable("Fewer than 5 trailing sessions of volume history available");

  if (candles.length > 0) {
    const last = candles[candles.length - 1]!;
    price = ok(last.close, "Upstox", UPSTOX_CANDLES_URL, last.ts);
    volume = ok(last.volume, "Upstox", UPSTOX_CANDLES_URL, last.ts);

    const prev = candles.length >= 2 ? candles[candles.length - 2]! : null;
    priceChangePct = prev
      ? ok(((last.close - prev.close) / prev.close) * 100, "Upstox", UPSTOX_CANDLES_URL, last.ts)
      : unavailable("Only one trading day of candle history returned");

    const trailing30 = candles.slice(-31, -1);
    if (trailing30.length >= 5) {
      volumeAvg30 = ok(
        mean(trailing30.map((c) => c.volume)),
        "Upstox",
        UPSTOX_CANDLES_URL,
        last.ts,
      );
    }
  }

  // -- Options: today's call/put volume + OI change at active strikes -----
  let callsVolume: SourcedField<number> = unavailable("Upstox option chain not configured or has no active expiry");
  let putsVolume: SourcedField<number> = unavailable("Upstox option chain not configured or has no active expiry");
  let activeStrikeOiChanges: SourcedField<ActiveStrikeOiChange[]> = unavailable(
    "Upstox option chain not configured or has no active expiry",
  );

  const expiries = await fetchUpstoxOptionExpiries(instrument.instrumentKey).catch(() => []);
  const nearestExpiry = expiries[0];
  if (nearestExpiry) {
    const snapshot = await fetchUpstoxOptionChain(
      instrument.instrumentKey,
      instrument.name,
      nearestExpiry,
    ).catch(() => null);
    if (snapshot) {
      const totalCalls = snapshot.rows.reduce((sum, r) => sum + (r.call?.volume ?? 0), 0);
      const totalPuts = snapshot.rows.reduce((sum, r) => sum + (r.put?.volume ?? 0), 0);
      callsVolume = ok(totalCalls, snapshot.source.provider, snapshot.source.url, snapshot.source.asOf ?? fetchedAt);
      putsVolume = ok(totalPuts, snapshot.source.provider, snapshot.source.url, snapshot.source.asOf ?? fetchedAt);

      const byActivity = [...snapshot.rows]
        .map((r) => ({ row: r, totalVolume: (r.call?.volume ?? 0) + (r.put?.volume ?? 0) }))
        .filter((r) => r.totalVolume > 0)
        .sort((a, b) => b.totalVolume - a.totalVolume)
        .slice(0, 3);

      const changes: ActiveStrikeOiChange[] = [];
      for (const { row } of byActivity) {
        if (row.call && (row.call.volume > 0 || row.call.oi > 0)) {
          changes.push({
            strike: row.strike,
            side: "call",
            volume: row.call.volume,
            oi: row.call.oi,
            prevOi: row.call.prevOi,
            change: row.call.oi - row.call.prevOi,
          });
        }
        if (row.put && (row.put.volume > 0 || row.put.oi > 0)) {
          changes.push({
            strike: row.strike,
            side: "put",
            volume: row.put.volume,
            oi: row.put.oi,
            prevOi: row.put.prevOi,
            change: row.put.oi - row.put.prevOi,
          });
        }
      }
      activeStrikeOiChanges = ok(changes, snapshot.source.provider, snapshot.source.url, snapshot.source.asOf ?? fetchedAt);
    }
  }

  // -- Upcoming dividend/bonus/split/rights, next 30 days -------------------
  // Upstox's fundamentals API has no earnings-date calendar (it only covers corporate
  // actions), so that half of this field is honestly labeled unavailable rather than guessed.
  let upcomingEvent: SourcedField<string> = unavailable(
    "Upstox not configured or the corporate actions endpoint returned no data",
  );
  try {
    const events = await fetchUpstoxCorporateActions(instrument.isin);
    if (events) {
      const upcoming = upcomingCorporateActions(events, 30, new Date(snapshotDate));
      const corporateActionNote =
        upcoming.length > 0
          ? upcoming
              .map((e) => {
                const amountPart = e.amount != null ? ` (₹${e.amount}/share)` : e.ratio ? ` (${e.ratio})` : "";
                return `${e.name} ex-date ${e.exDate}${amountPart}`;
              })
              .join("; ")
          : "No dividend/bonus/split/rights ex-date in the next 30 days";
      upcomingEvent = ok(
        `${corporateActionNote}. Earnings-date calendar is not available from Upstox's API.`,
        "Upstox",
        UPSTOX_CORP_ACTIONS_URL,
        fetchedAt,
      );
    }
  } catch (e) {
    upcomingEvent = unavailable(e instanceof Error ? e.message : "Upstox corporate actions fetch failed");
  }

  return {
    date: snapshotDate,
    symbol: instrument.symbol,
    name: instrument.name,
    instrumentKey: instrument.instrumentKey,
    price,
    priceChangePct,
    volume,
    volumeAvg30,
    callsVolume,
    putsVolume,
    activeStrikeOiChanges,
    upcomingEvent,
  };
}
