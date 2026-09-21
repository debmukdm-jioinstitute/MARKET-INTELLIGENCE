import type { AssumptionFmt } from "@/lib/models/types";

const currencyFormatters = new Map<string, Intl.NumberFormat>();
function currencyFormatter(currency: string) {
  let f = currencyFormatters.get(currency);
  if (!f) {
    f = new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 });
    currencyFormatters.set(currency, f);
  }
  return f;
}

export function formatByFmt(value: number | null | undefined, fmt: AssumptionFmt, currency = "USD"): string {
  if (value == null || !Number.isFinite(value)) return "—";
  switch (fmt) {
    case "pct":
      return `${(value * 100).toFixed(1)}%`;
    case "pct2":
      return `${(value * 100).toFixed(2)}%`;
    case "price":
      try {
        return currencyFormatter(currency).format(value);
      } catch {
        return value.toFixed(2);
      }
    case "mult":
      return `${value.toFixed(1)}x`;
    case "beta":
    case "factor":
      return value.toFixed(2);
    case "days":
      return `${value.toFixed(0)}d`;
    case "int":
      return String(Math.round(value));
    case "num1":
      return value.toLocaleString("en-US", { maximumFractionDigits: 1 });
    case "num":
    default:
      return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }
}

/** Compact large-number formatter for revenue/EBITDA/FCFF tables (values are already in millions). */
export function formatMillions(value: number, currency = "USD"): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  const symbol = currency === "INR" ? "₹" : currency === "USD" ? "$" : `${currency} `;
  if (abs >= 1e6) return `${sign}${symbol}${(abs / 1e6).toFixed(2)}T`;
  if (abs >= 1e3) return `${sign}${symbol}${(abs / 1e3).toFixed(2)}B`;
  return `${sign}${symbol}${abs.toFixed(1)}M`;
}
