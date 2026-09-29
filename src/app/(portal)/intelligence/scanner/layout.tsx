import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Nifty 500 Stock Screener — Breakouts & Scans",
  description: "Filter Nifty 500 stocks by breakouts, volume, trend and mean-reversion scans — descriptive, not buy/sell calls.",
  path: "/intelligence/scanner",
});

export default function ScannerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
