/** Pure statistics helpers shared by the portfolio, optimizer and scanner code. No data lives here. */
export function mean(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function stdev(values: number[], sample = true) {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const denom = sample ? values.length - 1 : values.length;
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / denom;
  return Math.sqrt(variance);
}

export function covariance(a: number[], b: number[]) {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  const ma = mean(a.slice(0, n));
  const mb = mean(b.slice(0, n));
  let sum = 0;
  for (let i = 0; i < n; i += 1) sum += (a[i]! - ma) * (b[i]! - mb);
  return sum / (n - 1);
}

export function returnsFromPrices(prices: number[]) {
  const out: number[] = [];
  for (let i = 1; i < prices.length; i += 1) out.push(prices[i]! / prices[i - 1]! - 1);
  return out;
}

export function maxDrawdown(values: number[]) {
  if (!values.length) return 0;
  let peak = values[0] ?? 0;
  let maxDd = 0;
  for (const value of values) {
    if (value > peak) peak = value;
    if (peak > 0) {
      maxDd = Math.min(maxDd, value / peak - 1);
    }
  }
  return Number.isFinite(maxDd) ? maxDd : 0;
}

export function cagr(values: number[], periodsPerYear = 252) {
  if (values.length < 2 || !values[0] || values[0] <= 0) return 0;
  const last = values[values.length - 1] ?? 0;
  if (last <= 0) return -1;
  const years = (values.length - 1) / periodsPerYear;
  const val = (last / values[0]!) ** (1 / Math.max(years, 1 / 252)) - 1;
  return Number.isFinite(val) ? val : 0;
}

export function percentile(values: number[], p: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.max(0, Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1))));
  return sorted[idx]!;
}
