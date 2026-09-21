const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const usdPrecise = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 2,
});

export function formatUsd(value: number, precise = false) {
  return (precise ? usdPrecise : usd).format(value);
}

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatInr(value: number) {
  return inr.format(value);
}

export function formatCompactInr(value: number) {
  if (Math.abs(value) >= 1_000_000) return `₹${compact.format(value)}`;
  return formatInr(value);
}

export function formatCompactUsd(value: number) {
  if (Math.abs(value) >= 1_000_000) return `$${compact.format(value)}`;
  return formatUsd(value);
}

export function formatPct(value: number, digits = 2, signed = true) {
  const sign = signed && value > 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(digits)}%`;
}

export function formatNumber(value: number, digits = 2) {
  return value.toFixed(digits);
}

export function formatSigned(value: number, digits = 2) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}`;
}

export function toneFromSigned(value: number): "up" | "down" | "neutral" {
  if (value > 0.0000001) return "up";
  if (value < -0.0000001) return "down";
  return "neutral";
}
