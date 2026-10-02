import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Trade Lab — Indicators, Patterns & Backtests for NSE",
  description:
    "Pick NIFTY, BANK NIFTY, SENSEX, BANKEX or any F&O stock. See RSI, MACD and 14 more indicators with plain-English readings, detected candlestick and chart patterns, and backtests — pure math, no AI.",
  path: "/intelligence/trade-lab",
});

export default function TradeLabLayout({ children }: { children: React.ReactNode }) {
  return children;
}
