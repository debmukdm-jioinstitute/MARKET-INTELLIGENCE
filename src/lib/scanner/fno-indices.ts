import type { IndexSignalBlock, SignalsRun } from "./types";

/** Primary NSE F&O index underlyings (Yahoo Finance daily chart tickers). */
export const FNO_INDEX_OPTIONS = [
  { id: "nifty50", label: "NIFTY 50", yahoo: "^NSEI" },
  { id: "banknifty", label: "BANK NIFTY", yahoo: "^NSEBANK" },
  { id: "finnifty", label: "FINNIFTY", yahoo: "^CNXFIN" },
  { id: "midcpnifty", label: "MIDCPNIFTY", yahoo: "^NSEMDCP50" },
  { id: "niftynxt50", label: "NIFTYNXT50", yahoo: "^NN50" },
] as const;

export type FnoIndexId = (typeof FNO_INDEX_OPTIONS)[number]["id"];

export const SIGNAL_HORIZON_OPTIONS = [
  { value: 1, label: "1 session (BTST / next day)" },
  { value: 2, label: "2 sessions" },
  { value: 3, label: "3 sessions" },
  { value: 5, label: "5 sessions (~1 week)" },
  { value: 10, label: "10 sessions (~2 weeks)" },
] as const;

export type SignalHorizon = (typeof SIGNAL_HORIZON_OPTIONS)[number]["value"];

export function getFnoIndex(id: string) {
  return FNO_INDEX_OPTIONS.find((x) => x.id === id) ?? FNO_INDEX_OPTIONS[0];
}

export function parseSignalHorizon(raw: string | null): SignalHorizon {
  const n = Number(raw);
  if (SIGNAL_HORIZON_OPTIONS.some((h) => h.value === n)) return n as SignalHorizon;
  return 1;
}

/** Resolve precomputed index model for UI/API (falls back to legacy `nifty` blob). */
export function pickIndexSignal(run: SignalsRun, indexId: string, horizon: SignalHorizon): IndexSignalBlock | null {
  const pack = run.indices?.[indexId];
  const block = pack?.horizons?.[horizon] ?? pack?.horizons?.[1];
  if (block) return block;
  if (indexId === "nifty50" && horizon === 1) {
    const n = run.nifty;
    return {
      close: n.close,
      changePct: n.changePct,
      horizon: 1,
      pUp: n.pUp ?? n.pUp1,
      call: n.call ?? n.call1,
      ema20: n.ema20,
      ema50: n.ema50,
      trend: n.trend,
      validation: n.validation,
    };
  }
  return null;
}
