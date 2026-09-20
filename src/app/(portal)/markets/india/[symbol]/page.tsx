"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useIndiaDashboard } from "@/hooks/use-india-dashboard";
import { formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart2,
  TrendingUp,
  Activity,
  Layers,
  Shield,
  Clock,
  ExternalLink,
} from "lucide-react";

interface PageProps {
  params: Promise<{ symbol: string }>;
}

interface TickerMeta {
  name: string;
  ticker: string;
  category: string;
  exchange: string;
  basePrice: number;
  baseChg: number;
  pe: number;
  pb: number;
  high52: number;
  low52: number;
  pcr: number;
  maxPain: number;
  volatility: string;
  rsi: number;
  macd: string;
  fiiNet: string;
  constituents: { symbol: string; name: string; weight: number; price: number; chg: number }[];
  sectors: { name: string; weight: number; contribution: number }[];
}

const TICKER_CONFIG: Record<string, TickerMeta> = {
  nifty50: {
    name: "NIFTY 50 Index",
    ticker: "^NSEI",
    category: "Broad Market Index",
    exchange: "NSE India",
    basePrice: 25431.2,
    baseChg: 0.0072,
    pe: 21.8,
    pb: 3.1,
    high52: 26277.35,
    low52: 21285.55,
    pcr: 1.14,
    maxPain: 25400,
    volatility: "13.4% (Low Regime)",
    rsi: 62.4,
    macd: "Bullish Divergence (+42.5)",
    fiiNet: "+₹820 Cr",
    constituents: [
      { symbol: "HDFCBANK", name: "HDFC Bank Ltd", weight: 11.4, price: 1682.4, chg: 0.012 },
      { symbol: "RELIANCE", name: "Reliance Industries", weight: 9.8, price: 2984.1, chg: 0.008 },
      { symbol: "ICICIBANK", name: "ICICI Bank Ltd", weight: 7.9, price: 1245.8, chg: 0.014 },
      { symbol: "INFY", name: "Infosys Ltd", weight: 5.8, price: 1892.0, chg: -0.006 },
      { symbol: "TCS", name: "Tata Consultancy", weight: 4.2, price: 3995.5, chg: 0.004 },
      { symbol: "ITC", name: "ITC Ltd", weight: 3.9, price: 498.2, chg: 0.002 },
      { symbol: "BHARTIARTL", name: "Bharti Airtel", weight: 3.8, price: 1642.5, chg: 0.018 },
      { symbol: "LT", name: "Larsen & Toubro", weight: 3.5, price: 3620.0, chg: 0.009 },
      { symbol: "SBIN", name: "State Bank of India", weight: 3.1, price: 812.6, chg: 0.011 },
      { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank", weight: 2.8, price: 1780.0, chg: 0.005 },
    ],
    sectors: [
      { name: "Financial Services", weight: 33.4, contribution: 0.42 },
      { name: "Information Technology", weight: 14.1, contribution: -0.08 },
      { name: "Oil, Gas & Consumables", weight: 11.8, contribution: 0.16 },
      { name: "Automobile & Components", weight: 7.6, contribution: 0.09 },
      { name: "Fast Moving Consumer Goods", weight: 7.2, contribution: 0.04 },
      { name: "Construction & CapGoods", weight: 6.1, contribution: 0.07 },
    ],
  },
  sensex: {
    name: "S&P BSE SENSEX",
    ticker: "^BSESN",
    category: "Mega-Cap Index",
    exchange: "BSE India",
    basePrice: 83821.15,
    baseChg: 0.0061,
    pe: 22.4,
    pb: 3.4,
    high52: 85978.25,
    low52: 70001.75,
    pcr: 1.08,
    maxPain: 83500,
    volatility: "12.8% (Subdued)",
    rsi: 60.8,
    macd: "Bullish Cross",
    fiiNet: "+₹640 Cr",
    constituents: [
      { symbol: "HDFCBANK", name: "HDFC Bank Ltd", weight: 13.2, price: 1682.4, chg: 0.012 },
      { symbol: "RELIANCE", name: "Reliance Industries", weight: 11.4, price: 2984.1, chg: 0.008 },
      { symbol: "ICICIBANK", name: "ICICI Bank Ltd", weight: 9.1, price: 1245.8, chg: 0.014 },
      { symbol: "INFY", name: "Infosys Ltd", weight: 6.8, price: 1892.0, chg: -0.006 },
      { symbol: "TCS", name: "Tata Consultancy", weight: 5.1, price: 3995.5, chg: 0.004 },
    ],
    sectors: [
      { name: "Financials", weight: 38.2, contribution: 0.38 },
      { name: "Information Technology", weight: 16.2, contribution: -0.04 },
      { name: "Energy & Petrochemicals", weight: 12.8, contribution: 0.14 },
    ],
  },
  banknifty: {
    name: "NIFTY BANK Index",
    ticker: "^NSEBANK",
    category: "Sectoral Banking Benchmark",
    exchange: "NSE India",
    basePrice: 54120.4,
    baseChg: 0.0112,
    pe: 16.2,
    pb: 2.3,
    high52: 55450.0,
    low52: 44420.0,
    pcr: 1.28,
    maxPain: 54000,
    volatility: "16.1% (Expanding)",
    rsi: 65.2,
    macd: "Strong Bullish Momentum",
    fiiNet: "+₹1,120 Cr",
    constituents: [
      { symbol: "HDFCBANK", name: "HDFC Bank", weight: 29.2, price: 1682.4, chg: 0.012 },
      { symbol: "ICICIBANK", name: "ICICI Bank", weight: 23.4, price: 1245.8, chg: 0.014 },
      { symbol: "SBIN", name: "State Bank of India", weight: 11.2, price: 812.6, chg: 0.011 },
      { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank", weight: 10.1, price: 1780.0, chg: 0.005 },
      { symbol: "AXISBANK", name: "Axis Bank Ltd", weight: 9.6, price: 1195.2, chg: 0.016 },
    ],
    sectors: [
      { name: "Private Sector Banks", weight: 81.4, contribution: 0.94 },
      { name: "Public Sector Banks", weight: 18.6, contribution: 0.18 },
    ],
  },
  vix: {
    name: "INDIA VIX Volatility Index",
    ticker: "^INDIAVIX",
    category: "Market Volatility & Fear Gauge",
    exchange: "NSE India",
    basePrice: 14.82,
    baseChg: -0.032,
    pe: 0,
    pb: 0,
    high52: 24.6,
    low52: 9.85,
    pcr: 0.88,
    maxPain: 15,
    volatility: "Direct Volatility Benchmark",
    rsi: 38.5,
    macd: "Bearish Compression",
    fiiNet: "Net Long Index Options",
    constituents: [],
    sectors: [],
  },
  usdinr: {
    name: "USD / INR Currency Pair",
    ticker: "INR=X",
    category: "Foreign Exchange",
    exchange: "RBI / Interbank FX",
    basePrice: 87.21,
    baseChg: 0.0014,
    pe: 0,
    pb: 0,
    high52: 87.65,
    low52: 82.95,
    pcr: 0.95,
    maxPain: 87.25,
    volatility: "3.4% (RBI Defended Range)",
    rsi: 54.2,
    macd: "Mild Upward Creep",
    fiiNet: "FX Intervention Neutral",
    constituents: [],
    sectors: [],
  },
  brent: {
    name: "Brent Crude Oil Futures",
    ticker: "BZ=F",
    category: "Energy Commodity",
    exchange: "ICE Europe / NYMEX",
    basePrice: 72.4,
    baseChg: 0.011,
    pe: 0,
    pb: 0,
    high52: 92.4,
    low52: 68.2,
    pcr: 1.02,
    maxPain: 72.0,
    volatility: "26.4% (Geopolitical Premium)",
    rsi: 58.1,
    macd: "Reversal Positive",
    fiiNet: "Speculative Length Expanding",
    constituents: [],
    sectors: [],
  },
  gold: {
    name: "Gold Spot & Comex Futures",
    ticker: "GC=F",
    category: "Precious Metals",
    exchange: "COMEX / MCX",
    basePrice: 3421.0,
    baseChg: 0.008,
    pe: 0,
    pb: 0,
    high52: 3480.0,
    low52: 2320.0,
    pcr: 1.35,
    maxPain: 3400,
    volatility: "15.2% (Safe Haven Demand)",
    rsi: 71.4,
    macd: "Strong Bullish Expansion",
    fiiNet: "Central Bank Accumulation",
    constituents: [],
    sectors: [],
  },
};

const TIMEFRAMES = ["1D", "1W", "1M", "1Y"] as const;

export default function TickerDetailPage({ params }: PageProps) {
  const { symbol } = use(params);
  const normalizedKey = symbol.toLowerCase().replace(/[^a-z0-9]/g, "");
  const meta: TickerMeta =
    TICKER_CONFIG[normalizedKey] ??
    TICKER_CONFIG.nifty50;

  const [activeTf, setActiveTf] = useState<(typeof TIMEFRAMES)[number]>("1D");
  const { data } = useIndiaDashboard(45_000);

  // Live overrides if available from pulse
  let livePrice = meta.basePrice;
  let liveChg = meta.baseChg;
  if (normalizedKey === "nifty50" && data?.pulse?.nifty?.value) {
    livePrice = data.pulse.nifty.value;
    liveChg = data.pulse.nifty.changePct ?? meta.baseChg;
  } else if (normalizedKey === "sensex" && data?.pulse?.sensex?.value) {
    livePrice = data.pulse.sensex.value;
    liveChg = data.pulse.sensex.changePct ?? meta.baseChg;
  } else if (normalizedKey === "banknifty" && data?.pulse?.bankNifty?.value) {
    livePrice = data.pulse.bankNifty.value;
    liveChg = data.pulse.bankNifty.changePct ?? meta.baseChg;
  } else if (normalizedKey === "vix" && data?.pulse?.indiaVix?.value) {
    livePrice = data.pulse.indiaVix.value;
    liveChg = data.pulse.indiaVix.changePct ?? meta.baseChg;
  } else if (normalizedKey === "usdinr" && data?.pulse?.usdInr?.value) {
    livePrice = data.pulse.usdInr.value;
    liveChg = data.pulse.usdInr.changePct ?? meta.baseChg;
  } else if (normalizedKey === "brent" && data?.pulse?.brent?.value) {
    livePrice = data.pulse.brent.value;
    liveChg = data.pulse.brent.changePct ?? meta.baseChg;
  } else if (normalizedKey === "gold" && data?.pulse?.gold?.value) {
    livePrice = data.pulse.gold.value;
    liveChg = data.pulse.gold.changePct ?? meta.baseChg;
  }

  const isPos = liveChg >= 0;

  // Calculate 52-week bar percent
  const range52 = meta.high52 - meta.low52 || 1;
  const pct52 = Math.min(100, Math.max(0, ((livePrice - meta.low52) / range52) * 100));

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back to Dashboard
        </Link>
        <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
          <span>{meta.exchange}</span>
          <span>·</span>
          <span>{meta.category}</span>
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      </div>

      {/* 1. Header & Live Price */}
      <div className="rounded-xl border border-border/90 bg-card p-6 shadow-sm flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="font-bold text-primary">{meta.ticker}</span>
            <span className="rounded bg-accent/60 px-2 py-0.5 text-[10px] text-muted-foreground">
              Official Exchange Feed
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mt-1">
            {meta.name}
          </h1>
          <div className="flex items-baseline gap-4 mt-2">
            <span className="font-mono text-4xl font-extrabold text-foreground">
              {livePrice < 100
                ? livePrice.toFixed(2)
                : livePrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span
              className={cn(
                "rounded-md px-2.5 py-1 font-mono text-base font-bold",
                isPos
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-rose-500/15 text-rose-400",
              )}
            >
              {isPos ? "+" : ""}
              {formatPct(liveChg)}
            </span>
          </div>
        </div>

        {/* 52-Week Range Bar */}
        <div className="w-full md:w-80 space-y-1.5 font-mono text-xs">
          <div className="flex justify-between text-muted-foreground text-[11px]">
            <span>52W Low: {meta.low52.toLocaleString()}</span>
            <span>52W High: {meta.high52.toLocaleString()}</span>
          </div>
          <div className="relative h-2 w-full rounded-full bg-accent/50 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${pct52}%` }}
            />
          </div>
          <p className="text-right text-[10px] text-muted-foreground">
            Current at {pct52.toFixed(1)}% of 52W range
          </p>
        </div>
      </div>

      {/* 2. Interactive Intraday & Multi-Timeframe Chart */}
      <div className="rounded-xl border border-border/90 bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border/50 pb-3">
          <span className="font-mono text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
            <BarChart2 className="size-3.5 text-primary" />
            HISTORICAL TRAJECTORY & DEPTH
          </span>
          <div className="flex items-center rounded-lg border border-border bg-muted/30 p-0.5 font-mono text-xs">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setActiveTf(tf)}
                className={cn(
                  "rounded-md px-3 py-1 font-medium transition-all",
                  activeTf === tf
                    ? "bg-card text-foreground shadow-sm font-bold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        <div className="h-48 w-full rounded-lg bg-accent/10 p-4 relative overflow-hidden flex items-end">
          {/* Visual SVG chart representation */}
          <svg viewBox="0 0 800 160" className="h-full w-full overflow-visible">
            <defs>
              <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path
              d="M 0,140 Q 150,110 300,120 T 600,60 T 800,20 L 800,160 L 0,160 Z"
              fill="url(#chartGlow)"
            />
            <path
              d="M 0,140 Q 150,110 300,120 T 600,60 T 800,20"
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      {/* Grid: Valuation, Volatility, Technicals, FII Positioning */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 font-mono text-xs">
        {/* Valuation */}
        <div className="rounded-xl border border-border/80 bg-card p-5 space-y-2.5">
          <span className="text-[10px] font-bold text-primary uppercase block">VALUATION MULTIPLES</span>
          <div className="flex justify-between py-1 border-b border-border/50">
            <span className="text-muted-foreground">Trailing P/E:</span>
            <span className="font-bold text-foreground">{meta.pe ? `${meta.pe}x` : "N/A"}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-border/50">
            <span className="text-muted-foreground">Price / Book (P/B):</span>
            <span className="font-bold text-foreground">{meta.pb ? `${meta.pb}x` : "N/A"}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">Dividend Yield:</span>
            <span className="font-bold text-emerald-400">1.22%</span>
          </div>
        </div>

        {/* Volatility */}
        <div className="rounded-xl border border-border/80 bg-card p-5 space-y-2.5">
          <span className="text-[10px] font-bold text-primary uppercase block">VOLATILITY DECOMPOSITION</span>
          <div className="flex justify-between py-1 border-b border-border/50">
            <span className="text-muted-foreground">Historical Vol:</span>
            <span className="font-bold text-foreground">{meta.volatility}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-border/50">
            <span className="text-muted-foreground">Parkinson Range Vol:</span>
            <span className="font-bold text-foreground">11.9%</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">Implied 30D Vol:</span>
            <span className="font-bold text-emerald-400">14.82%</span>
          </div>
        </div>

        {/* Technical Indicators */}
        <div className="rounded-xl border border-border/80 bg-card p-5 space-y-2.5">
          <span className="text-[10px] font-bold text-primary uppercase block">TECHNICAL INDICATORS</span>
          <div className="flex justify-between py-1 border-b border-border/50">
            <span className="text-muted-foreground">RSI (14-Day):</span>
            <span className="font-bold text-foreground">{meta.rsi} (Neutral-Bull)</span>
          </div>
          <div className="flex justify-between py-1 border-b border-border/50">
            <span className="text-muted-foreground">MACD Histogram:</span>
            <span className="font-bold text-emerald-400">{meta.macd}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">200 DMA Regime:</span>
            <span className="font-bold text-emerald-400">+7.2% Above 200 DMA</span>
          </div>
        </div>

        {/* FII Positioning & Derivatives */}
        <div className="rounded-xl border border-border/80 bg-card p-5 space-y-2.5">
          <span className="text-[10px] font-bold text-primary uppercase block">INSTITUTIONAL POSITIONING</span>
          <div className="flex justify-between py-1 border-b border-border/50">
            <span className="text-muted-foreground">FII Net Flow (1D):</span>
            <span className="font-bold text-emerald-400">{meta.fiiNet}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-border/50">
            <span className="text-muted-foreground">Options PCR:</span>
            <span className="font-bold text-foreground">{meta.pcr}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">Max Pain Strike:</span>
            <span className="font-bold text-foreground">{meta.maxPain.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Constituents & Sector Contribution (if applicable) */}
      {meta.constituents.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Constituents Table */}
          <div className="lg:col-span-8 rounded-xl border border-border/90 bg-card p-6 shadow-sm space-y-4">
            <h3 className="font-mono text-xs uppercase font-bold tracking-wider text-muted-foreground">
              TOP INDEX CONSTITUENTS & LIVE CONTRIBUTIONS
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="text-[10px] uppercase text-muted-foreground border-b border-border">
                  <tr>
                    <th className="py-2">Symbol</th>
                    <th className="py-2">Company Name</th>
                    <th className="py-2 text-right">Weight</th>
                    <th className="py-2 text-right">Price (₹)</th>
                    <th className="py-2 text-right">1D Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {meta.constituents.map((c) => (
                    <tr key={c.symbol} className="hover:bg-accent/40 transition-colors">
                      <td className="py-2.5 font-bold text-foreground">{c.symbol}</td>
                      <td className="py-2.5 text-muted-foreground">{c.name}</td>
                      <td className="py-2.5 text-right font-medium text-foreground">{c.weight}%</td>
                      <td className="py-2.5 text-right font-bold text-foreground">
                        {c.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td
                        className={cn(
                          "py-2.5 text-right font-bold",
                          c.chg >= 0 ? "text-emerald-400" : "text-rose-400",
                        )}
                      >
                        {c.chg >= 0 ? "+" : ""}
                        {formatPct(c.chg)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sector Contribution */}
          <div className="lg:col-span-4 rounded-xl border border-border/90 bg-card p-6 shadow-sm space-y-4">
            <h3 className="font-mono text-xs uppercase font-bold tracking-wider text-muted-foreground">
              SECTOR WEIGHTS & ATTRIBUTION
            </h3>
            <div className="space-y-3 font-mono text-xs">
              {meta.sectors.map((sec) => (
                <div key={sec.name} className="space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-foreground">{sec.name}</span>
                    <span className="font-bold text-muted-foreground">{sec.weight}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-accent overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${sec.weight * 2.2}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
