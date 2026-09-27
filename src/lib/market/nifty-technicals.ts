export type NiftyMomentumSnapshot = {
  asOf: string | null;
  vsDma20: number | null;
  vsDma50: number | null;
  vsDma200: number | null;
  rsi14: number | null;
  macdHist: number | null;
  regimeLabel: string;
};

type Point = { date: string; value: number };

function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function rsi14(closes: number[]): number | null {
  if (closes.length < 15) return null;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - 14; i < closes.length; i += 1) {
    const d = closes[i]! - closes[i - 1]!;
    if (d >= 0) gains += d;
    else losses -= d;
  }
  const avgGain = gains / 14;
  const avgLoss = losses / 14;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev = values[0] ?? 0;
  for (let i = 0; i < values.length; i += 1) {
    prev = i === 0 ? values[0]! : values[i]! * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

function pctVs(price: number, ref: number | null): number | null {
  if (ref == null || ref <= 0) return null;
  return (price / ref - 1) * 100;
}

export function computeNiftyMomentum(points: Point[]): NiftyMomentumSnapshot {
  const sorted = [...points].sort((a, b) => (a.date < b.date ? -1 : 1));
  const closes = sorted.map((p) => p.value).filter((v) => v > 0);
  if (closes.length < 30) {
    return {
      asOf: sorted[sorted.length - 1]?.date ?? null,
      vsDma20: null,
      vsDma50: null,
      vsDma200: null,
      rsi14: null,
      macdHist: null,
      regimeLabel: "Insufficient NIFTY history",
    };
  }
  const last = closes[closes.length - 1]!;
  const dma20 = sma(closes, 20);
  const dma50 = sma(closes, 50);
  const dma200 = sma(closes, 200);
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macdLine = ema12[ema12.length - 1]! - ema26[ema26.length - 1]!;
  const macdSeries = ema12.map((v, i) => v - ema26[i]!);
  const signal = ema(macdSeries, 9);
  const macdHist = macdLine - signal[signal.length - 1]!;

  const vs20 = pctVs(last, dma20);
  const adRatioHint = vs20 != null && vs20 > 0 ? "bull" : "bear";
  let regimeLabel = "Mixed / transitional";
  if (vs20 != null && vs20 > 1 && (rsi14(closes) ?? 0) > 55) regimeLabel = "Short-term momentum positive";
  else if (vs20 != null && vs20 < -1) regimeLabel = "Below 20 DMA — defensive";
  else if (adRatioHint === "bull") regimeLabel = "Constructive trend";

  return {
    asOf: sorted[sorted.length - 1]?.date ?? null,
    vsDma20: pctVs(last, dma20),
    vsDma50: pctVs(last, dma50),
    vsDma200: pctVs(last, dma200),
    rsi14: rsi14(closes),
    macdHist,
    regimeLabel,
  };
}

export function formatDmaLine(pct: number | null, label: string): string {
  if (pct == null) return "—";
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}% (${label})`;
}
