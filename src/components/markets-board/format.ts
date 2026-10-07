/** Unicode minus, matching `formatPct`. */
export function formatSignedNumber(value: number, digits: number): string {
  const abs = Math.abs(value).toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits > 2 ? digits : Math.min(2, digits),
  });
  if (value < 0) return `\u2212${abs}`;
  if (value > 0) return `+${abs}`;
  return abs;
}

export function formatChangePct(pct: number | null): string {
  if (pct == null || !Number.isFinite(pct)) return "—";
  return `${formatSignedNumber(pct * 100, 2)}%`;
}

export function formatBoardPrice(value: number | null, decimals: number): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals > 0 ? Math.min(2, decimals) : 0,
  });
}

export function formatVolumeShort(volume: number | null): string {
  if (volume == null || !Number.isFinite(volume) || volume <= 0) return "—";
  if (volume >= 1e9) return `${(volume / 1e9).toFixed(2)}B`;
  if (volume >= 1e6) return `${(volume / 1e6).toFixed(2)}M`;
  if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`;
  return volume.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function formatVolumeLong(volume: number | null): string {
  if (volume == null || !Number.isFinite(volume) || volume <= 0) return "—";
  if (volume >= 1e9) return `${(volume / 1e9).toFixed(2)} billion`;
  if (volume >= 1e6) return `${(volume / 1e6).toFixed(2)} million`;
  if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)} thousand`;
  return volume.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function rangePosition(price: number | null, low: number | null, high: number | null): number | null {
  if (price == null || low == null || high == null) return null;
  if (!Number.isFinite(price) || !Number.isFinite(low) || !Number.isFinite(high)) return null;
  if (high <= low) return 50;
  return Math.min(100, Math.max(0, ((price - low) / (high - low)) * 100));
}
