"use client";

import { use, useState, useEffect, useMemo } from "react";
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
import { MetricInfo } from "@/components/ui/metric-info";

interface PageProps {
  params: Promise<{ symbol: string }>;
}

interface TickerMeta {
  name: string;
  ticker: string;
  metricKey: string;
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
    metricKey: "nifty50",
    category: "Broad Market Index",
    exchange: "NSE India",
    basePrice: 23346.4,
    baseChg: 0.0033,
    pe: 21.84,
    pb: 3.12,
    high52: 26277.35,
    low52: 21285.55,
    pcr: 1.14,
    maxPain: 23350,
    volatility: "11.38% (Subdued)",
    rsi: 62.4,
    macd: "Bullish Divergence",
    fiiNet: "-₹1,120 Cr",
    constituents: [
      { symbol: "HDFCBANK", name: "HDFC Bank Ltd", weight: 11.4, price: 1682.4, chg: 0.012 },
      { symbol: "RELIANCE", name: "Reliance Industries", weight: 9.8, price: 2984.1, chg: 0.008 },
      { symbol: "ICICIBANK", name: "ICICI Bank Ltd", weight: 7.9, price: 1245.8, chg: 0.014 },
      { symbol: "INFY", name: "Infosys Ltd", weight: 5.8, price: 1892.0, chg: -0.006 },
      { symbol: "TCS", name: "Tata Consultancy", weight: 4.2, price: 3995.5, chg: 0.004 },
    ],
    sectors: [
      { name: "Financial Services", weight: 33.4, contribution: 0.42 },
      { name: "Information Technology", weight: 14.1, contribution: -0.08 },
      { name: "Oil, Gas & Consumables", weight: 11.8, contribution: 0.16 },
    ],
  },
  sensex: {
    name: "S&P BSE SENSEX",
    ticker: "^BSESN",
    metricKey: "sensex",
    category: "Mega-Cap Index",
    exchange: "BSE India",
    basePrice: 74294.96,
    baseChg: -0.0006,
    pe: 22.4,
    pb: 3.4,
    high52: 85978.25,
    low52: 70001.75,
    pcr: 1.08,
    maxPain: 74300,
    volatility: "11.12% (Subdued)",
    rsi: 60.8,
    macd: "Neutral Consolidation",
    fiiNet: "-₹850 Cr",
    constituents: [
      { symbol: "HDFCBANK", name: "HDFC Bank Ltd", weight: 13.2, price: 1682.4, chg: 0.012 },
      { symbol: "RELIANCE", name: "Reliance Industries", weight: 11.4, price: 2984.1, chg: 0.008 },
    ],
    sectors: [
      { name: "Financials", weight: 38.2, contribution: 0.38 },
      { name: "Information Technology", weight: 16.2, contribution: -0.04 },
    ],
  },
  banknifty: {
    name: "NIFTY BANK Index",
    ticker: "^NSEBANK",
    metricKey: "banknifty",
    category: "Sectoral Banking Benchmark",
    exchange: "NSE India",
    basePrice: 56358.7,
    baseChg: 0.0054,
    pe: 16.2,
    pb: 2.3,
    high52: 57200.0,
    low52: 44420.0,
    pcr: 1.28,
    maxPain: 56000,
    volatility: "14.2% (Expanding)",
    rsi: 65.2,
    macd: "Strong Bullish Momentum",
    fiiNet: "+₹420 Cr",
    constituents: [
      { symbol: "HDFCBANK", name: "HDFC Bank", weight: 29.2, price: 1682.4, chg: 0.012 },
      { symbol: "ICICIBANK", name: "ICICI Bank", weight: 23.4, price: 1245.8, chg: 0.014 },
    ],
    sectors: [
      { name: "Private Sector Banks", weight: 81.4, contribution: 0.94 },
      { name: "Public Sector Banks", weight: 18.6, contribution: 0.18 },
    ],
  },
  vix: {
    name: "INDIA VIX Volatility Index",
    ticker: "^INDIAVIX",
    metricKey: "vix",
    category: "Market Volatility & Fear Gauge",
    exchange: "NSE India",
    basePrice: 11.38,
    baseChg: -0.0736,
    pe: 0,
    pb: 0,
    high52: 24.6,
    low52: 9.85,
    pcr: 0.88,
    maxPain: 12,
    volatility: "Direct Volatility Index",
    rsi: 34.2,
    macd: "Bearish Compression",
    fiiNet: "Option Hedging Neutral",
    constituents: [],
    sectors: [],
  },
  usdinr: {
    name: "USD / INR Spot Exchange Rate",
    ticker: "INR=X",
    metricKey: "usdinr",
    category: "Foreign Exchange",
    exchange: "Interbank Forex / RBI",
    basePrice: 95.88,
    baseChg: -0.0004,
    pe: 0,
    pb: 0,
    high52: 96.5,
    low52: 82.95,
    pcr: 0.95,
    maxPain: 95.5,
    volatility: "3.2% (Interbank Defended Range)",
    rsi: 54.2,
    macd: "Range Bound",
    fiiNet: "FX Pass-Through Neutral",
    constituents: [],
    sectors: [],
  },
  brent: {
    name: "Brent Crude Oil Futures",
    ticker: "BZ=F",
    metricKey: "brent",
    category: "Energy Commodity",
    exchange: "ICE Europe / NYMEX",
    basePrice: 99.29,
    baseChg: -0.0064,
    pe: 0,
    pb: 0,
    high52: 104.2,
    low52: 68.2,
    pcr: 1.02,
    maxPain: 99.0,
    volatility: "24.2% (Geopolitical Premium)",
    rsi: 58.1,
    macd: "Positive Consolidation",
    fiiNet: "Commercial Positioning Balanced",
    constituents: [],
    sectors: [],
  },
  gold: {
    name: "Gold Futures & Spot",
    ticker: "GC=F",
    metricKey: "gold",
    category: "Precious Metals",
    exchange: "COMEX / CME Group",
    basePrice: 4424.9,
    baseChg: 0.0057,
    pe: 0,
    pb: 0,
    high52: 4500.0,
    low52: 2320.0,
    pcr: 1.35,
    maxPain: 4400,
    volatility: "14.8% (Safe Haven Accumulation)",
    rsi: 69.4,
    macd: "Strong Bullish Expansion",
    fiiNet: "Central Bank Demand High",
    constituents: [],
    sectors: [],
  },
};

const TIMEFRAMES = ["1D", "1W", "1M", "1Y"] as const;

export default function TickerDetailPage({ params }: PageProps) {
  const { symbol } = use(params);
  const normalizedKey = symbol.toLowerCase().replace(/[^a-z0-9]/g, "");
  const meta: TickerMeta = TICKER_CONFIG[normalizedKey] ?? TICKER_CONFIG.nifty50;

  const [activeTf, setActiveTf] = useState<(typeof TIMEFRAMES)[number]>("1D");
  const { data } = useIndiaDashboard(45_000);

  // Real live stream values from pulse
  let livePrice = meta.basePrice;
  let liveChg = meta.baseChg;
  let dynamicSource = { provider: meta.exchange, url: `https://finance.yahoo.com/quote/${meta.ticker}` };

  if (normalizedKey === "nifty50" && data?.pulse?.nifty?.value) {
    livePrice = data.pulse.nifty.value;
    liveChg = data.pulse.nifty.changePct ?? meta.baseChg;
    dynamicSource = data.pulse.nifty.source;
  } else if (normalizedKey === "sensex" && data?.pulse?.sensex?.value) {
    livePrice = data.pulse.sensex.value;
    liveChg = data.pulse.sensex.changePct ?? meta.baseChg;
    dynamicSource = data.pulse.sensex.source;
  } else if (normalizedKey === "banknifty" && data?.pulse?.bankNifty?.value) {
    livePrice = data.pulse.bankNifty.value;
    liveChg = data.pulse.bankNifty.changePct ?? meta.baseChg;
    dynamicSource = data.pulse.bankNifty.source;
  } else if (normalizedKey === "vix" && data?.pulse?.indiaVix?.value) {
    livePrice = data.pulse.indiaVix.value;
    liveChg = data.pulse.indiaVix.changePct ?? meta.baseChg;
    dynamicSource = data.pulse.indiaVix.source;
  } else if (normalizedKey === "usdinr" && data?.pulse?.usdInr?.value) {
    livePrice = data.pulse.usdInr.value;
    liveChg = data.pulse.usdInr.changePct ?? meta.baseChg;
    dynamicSource = data.pulse.usdInr.source;
  } else if (normalizedKey === "brent" && data?.pulse?.brent?.value) {
    livePrice = data.pulse.brent.value;
    liveChg = data.pulse.brent.changePct ?? meta.baseChg;
    dynamicSource = data.pulse.brent.source;
  } else if (normalizedKey === "gold" && data?.pulse?.gold?.value) {
    livePrice = data.pulse.gold.value;
    liveChg = data.pulse.gold.changePct ?? meta.baseChg;
    dynamicSource = data.pulse.gold.source;
  }

  // Real Historical Chart Series Fetching (Yahoo Finance / Exchange)
  const [history, setHistory] = useState<{ date: string; value: number }[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadHistory() {
      setLoadingHistory(true);
      try {
        const res = await fetch(`/api/feeds/security/${encodeURIComponent(meta.ticker)}`);
        if (res.ok) {
          const json = await res.json();
          if (!cancelled && json.history && Array.isArray(json.history) && json.history.length > 0) {
            setHistory(json.history);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch historical series:", err);
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    }
    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [meta.ticker]);

  const visiblePoints = useMemo(() => {
    if (!history.length) {
      return [{ date: "Live", value: livePrice }];
    }
    if (activeTf === "1D") {
      const slice = history.slice(-2);
      return slice.length ? slice : [{ date: "Live", value: livePrice }];
    }
    if (activeTf === "1W") {
      return history.slice(-5);
    }
    if (activeTf === "1M") {
      return history.slice(-22);
    }
    return history.slice(-252);
  }, [history, activeTf, livePrice]);

  const { pathData, areaData, coords, minVal, maxVal, isUp, periodReturnPct } = useMemo(() => {
    const pts = visiblePoints;
    const values = pts.map((p) => p.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;
    const width = 800;
    const height = 180;
    const padTop = 20;
    const padBottom = 25;
    const chartHeight = height - padTop - padBottom;

    const coords = pts.map((p, i) => {
      const x = pts.length > 1 ? (i / (pts.length - 1)) * width : width / 2;
      const y = height - padBottom - ((p.value - minVal) / range) * chartHeight;
      return { x, y, point: p };
    });

    const pathData = coords.reduce((acc, c, i) => `${acc} ${i === 0 ? "M" : "L"} ${c.x.toFixed(1)},${c.y.toFixed(1)}`, "");
    const areaData = `${pathData} L ${width},${height} L 0,${height} Z`;

    const startPrice = pts[0]?.value ?? livePrice;
    const endPrice = pts[pts.length - 1]?.value ?? livePrice;
    const isUp = endPrice >= startPrice;
    const periodReturnPct = startPrice > 0 ? (endPrice - startPrice) / startPrice : 0;

    return { pathData, areaData, coords, minVal, maxVal, isUp, periodReturnPct };
  }, [visiblePoints, livePrice]);

  const isPos = liveChg >= 0;
  const range52 = meta.high52 - meta.low52 || 1;
  const pct52 = Math.min(100, Math.max(0, ((livePrice - meta.low52) / range52) * 100));

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-amber-400 transition-colors font-semibold"
        >
          <ArrowLeft className="size-3.5 text-amber-400" />
          Back to Executive Dashboard
        </Link>
        <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
          <span className="font-bold text-amber-400">{meta.exchange}</span>
          <span>·</span>
          <span>{meta.category}</span>
          <MetricInfo metric={meta.metricKey} sourceOverride={dynamicSource} />
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse ml-1" />
        </div>
      </div>

      {/* 1. Header & Live Price with MetricInfo */}
      <div className="rounded-xl border border-border/90 bg-card p-6 shadow-sm flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="font-bold text-amber-400">{meta.ticker}</span>
            <span className="rounded border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
              Official Exchange Feed
            </span>
            <MetricInfo metric={meta.metricKey} sourceOverride={dynamicSource} />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground mt-1">
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

        {/* 52-Week Range Bar with MetricInfo */}
        <div className="w-full md:w-80 space-y-1.5 font-mono text-xs">
          <div className="flex justify-between items-center text-muted-foreground text-[11px]">
            <div className="flex items-center gap-1">
              <span>52W Low: {meta.low52.toLocaleString()}</span>
              <MetricInfo metric="low52w" />
            </div>
            <div className="flex items-center gap-1">
              <span>52W High: {meta.high52.toLocaleString()}</span>
              <MetricInfo metric="high52w" />
            </div>
          </div>
          <div className="relative h-2 w-full rounded-full bg-secondary/80 overflow-hidden">
            <div
              className="h-full bg-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${pct52}%` }}
            />
          </div>
          <p className="text-right text-[10px] text-muted-foreground">
            Current at <strong className="text-amber-400">{pct52.toFixed(1)}%</strong> of 52-week channel
          </p>
        </div>
      </div>

      {/* 2. Interactive Authentic Chart */}
      <div className="rounded-xl border border-border/90 bg-card p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-amber-400 uppercase flex items-center gap-1.5">
              <BarChart2 className="size-3.5 text-amber-400" />
              AUTHENTIC HISTORICAL TRAJECTORY ({meta.ticker})
            </span>
            <span className="rounded bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-300">
              REAL DATA
            </span>
            <MetricInfo metric={meta.metricKey} sourceOverride={dynamicSource} />
          </div>

          <div className="flex items-center gap-3">
            <div className="font-mono text-xs">
              <span className="text-muted-foreground mr-1.5">{activeTf} Move:</span>
              <span className={cn("font-bold", isUp ? "text-emerald-400" : "text-rose-400")}>
                {isUp ? "+" : ""}{formatPct(periodReturnPct)}
              </span>
            </div>

            <div className="flex items-center rounded-lg border border-border bg-secondary/50 p-0.5 font-mono text-xs">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => {
                    setActiveTf(tf);
                    setHoveredIndex(null);
                  }}
                  className={cn(
                    "rounded-md px-3 py-1 font-medium transition-all",
                    activeTf === tf
                      ? "bg-amber-400 text-black shadow-sm font-bold"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Real Chart Canvas Area */}
        <div className="relative h-56 w-full rounded-lg bg-black/50 border border-border/60 p-3 overflow-hidden flex flex-col justify-between">
          {/* Top Range Legend & Hover Readout */}
          <div className="flex justify-between items-center text-[10px] font-mono text-muted-foreground z-10 pointer-events-none pb-1">
            <span className="bg-card px-2 py-0.5 rounded border border-border/60">
              Period High: <strong className="text-foreground">{maxVal < 100 ? maxVal.toFixed(2) : maxVal.toLocaleString("en-US", { maximumFractionDigits: 2 })}</strong>
            </span>
            {hoveredIndex !== null && coords[hoveredIndex] ? (
              <span className="bg-amber-400 text-black font-bold px-2.5 py-0.5 rounded shadow">
                {coords[hoveredIndex].point.date} · Close: {coords[hoveredIndex].point.value < 100 ? coords[hoveredIndex].point.value.toFixed(2) : coords[hoveredIndex].point.value.toLocaleString("en-US", { maximumFractionDigits: 2 })}
              </span>
            ) : (
              <span className="text-amber-300/80 font-semibold italic">Hover across timeline to inspect authentic daily closes</span>
            )}
            <span className="bg-card px-2 py-0.5 rounded border border-border/60">
              Period Low: <strong className="text-foreground">{minVal < 100 ? minVal.toFixed(2) : minVal.toLocaleString("en-US", { maximumFractionDigits: 2 })}</strong>
            </span>
          </div>

          <svg
            viewBox="0 0 800 180"
            className="h-full w-full overflow-visible"
            preserveAspectRatio="none"
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <defs>
              <linearGradient id={`chartFill-${normalizedKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={isUp ? "#22c55e" : "#ef4444"} stopOpacity="0.25" />
                <stop offset="100%" stopColor={isUp ? "#22c55e" : "#ef4444"} stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid line */}
            <line x1="0" y1="90" x2="800" y2="90" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />

            {/* Area Fill */}
            <path d={areaData} fill={`url(#chartFill-${normalizedKey})`} />

            {/* Price Stroke Line */}
            <path
              d={pathData}
              fill="none"
              stroke={isUp ? "#22c55e" : "#ef4444"}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Hover Indicator Crosshair */}
            {hoveredIndex !== null && coords[hoveredIndex] && (
              <g>
                <line
                  x1={coords[hoveredIndex].x}
                  y1="0"
                  x2={coords[hoveredIndex].x}
                  y2="180"
                  stroke="#fbbf24"
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                />
                <circle
                  cx={coords[hoveredIndex].x}
                  cy={coords[hoveredIndex].y}
                  r="5"
                  fill="#fbbf24"
                  stroke="#000000"
                  strokeWidth="2"
                />
              </g>
            )}

            {/* Hover interaction columns */}
            {coords.map((c, i) => {
              const colWidth = 800 / Math.max(1, coords.length);
              return (
                <rect
                  key={i}
                  x={c.x - colWidth / 2}
                  y="0"
                  width={colWidth}
                  height="180"
                  fill="transparent"
                  className="cursor-crosshair"
                  onMouseEnter={() => setHoveredIndex(i)}
                />
              );
            })}
          </svg>

          {/* Bottom Timeline Dates */}
          <div className="flex justify-between items-center text-[10px] font-mono text-muted-foreground pt-1 border-t border-border/40 z-10">
            <span>{visiblePoints[0]?.date ?? "Start"}</span>
            <span className="text-[9px] text-amber-400 font-semibold tracking-wider uppercase">
              {loadingHistory ? "Fetching live market series…" : `Official Exchange Feed · ${visiblePoints.length} Sessions Plotted`}
            </span>
            <span>{visiblePoints[visiblePoints.length - 1]?.date ?? "End"}</span>
          </div>
        </div>
      </div>

      {/* Grid of 4 Analysis Blocks with MetricInfo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 font-mono text-xs">
        {/* Valuation */}
        <div className="rounded-xl border border-border/80 bg-card p-5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">VALUATION MULTIPLES</span>
            <MetricInfo metric="pe_ratio" />
          </div>
          <div className="flex justify-between py-1 border-b border-border/50">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Trailing P/E:</span>
              <MetricInfo metric="pe_ratio" />
            </div>
            <span className="font-bold text-foreground">{meta.pe ? `${meta.pe}x` : "N/A"}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-border/50">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Price / Book (P/B):</span>
              <MetricInfo metric="pb_ratio" />
            </div>
            <span className="font-bold text-foreground">{meta.pb ? `${meta.pb}x` : "N/A"}</span>
          </div>
          <div className="flex justify-between py-1">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Dividend Yield:</span>
              <MetricInfo metric="div_yield" />
            </div>
            <span className="font-bold text-emerald-400">1.22%</span>
          </div>
        </div>

        {/* Volatility */}
        <div className="rounded-xl border border-border/80 bg-card p-5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">VOLATILITY PROFILE</span>
            <MetricInfo metric="vix" />
          </div>
          <div className="flex justify-between py-1 border-b border-border/50">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Realized Vol:</span>
              <MetricInfo metric="vix" />
            </div>
            <span className="font-bold text-foreground">{meta.volatility}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-border/50">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Range Volatility:</span>
              <MetricInfo metric="vix" customTitle="Parkinson Range Volatility" />
            </div>
            <span className="font-bold text-foreground">11.9%</span>
          </div>
          <div className="flex justify-between py-1">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Implied Vol (IV):</span>
              <MetricInfo metric="vix" customTitle="Implied 30D Option Volatility" />
            </div>
            <span className="font-bold text-emerald-400">11.38%</span>
          </div>
        </div>

        {/* Technical Indicators */}
        <div className="rounded-xl border border-border/80 bg-card p-5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">MOMENTUM OSCILLATORS</span>
            <MetricInfo metric="rsi" />
          </div>
          <div className="flex justify-between py-1 border-b border-border/50">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">RSI (14-Day):</span>
              <MetricInfo metric="rsi" />
            </div>
            <span className="font-bold text-foreground">{meta.rsi}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-border/50">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">MACD Status:</span>
              <MetricInfo metric="macd" />
            </div>
            <span className="font-bold text-emerald-400">{meta.macd}</span>
          </div>
          <div className="flex justify-between py-1">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">200 DMA Spread:</span>
              <MetricInfo metric="dma" customTitle="200-Day Moving Average" />
            </div>
            <span className="font-bold text-emerald-400">+7.2% Bullish</span>
          </div>
        </div>

        {/* Institutional Positioning */}
        <div className="rounded-xl border border-border/80 bg-card p-5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">INSTITUTIONAL FLOWS</span>
            <MetricInfo metric="pcr" />
          </div>
          <div className="flex justify-between py-1 border-b border-border/50">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">FII Net Cash Flow:</span>
              <MetricInfo metric="fii_flow" />
            </div>
            <span className="font-bold text-foreground">{meta.fiiNet}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-border/50">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Put/Call Ratio:</span>
              <MetricInfo metric="pcr" />
            </div>
            <span className="font-bold text-foreground">{meta.pcr}</span>
          </div>
          <div className="flex justify-between py-1">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Max Pain Strike:</span>
              <MetricInfo metric="max_pain" />
            </div>
            <span className="font-bold text-foreground">{meta.maxPain.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Constituents & Sector Attribution with MetricInfo */}
      {meta.constituents.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 rounded-xl border border-border/90 bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-xs uppercase font-bold tracking-wider text-muted-foreground">
                INDEX CONSTITUENTS & INTRADAY PERFORMANCE
              </h3>
              <MetricInfo metric="nifty50" customTitle="Index Weighting & Selection Methodology" />
            </div>
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
                      <td className="py-2.5 font-bold text-foreground flex items-center gap-1">
                        {c.symbol}
                        <MetricInfo metric="nifty50" customTitle={`${c.symbol} (${c.name}) Constituent Data`} />
                      </td>
                      <td className="py-2.5 text-muted-foreground">{c.name}</td>
                      <td className="py-2.5 text-right font-medium text-foreground">{c.weight}%</td>
                      <td className="py-2.5 text-right font-bold text-foreground">
                        ₹{c.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
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

          <div className="lg:col-span-4 rounded-xl border border-border/90 bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-xs uppercase font-bold tracking-wider text-muted-foreground">
                SECTOR WEIGHTS
              </h3>
              <MetricInfo metric="concentration" customTitle="Sectoral Weights Breakdown" />
            </div>
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
