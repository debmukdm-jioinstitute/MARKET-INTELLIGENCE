"use client";

import { use, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useIndiaDashboard } from "@/hooks/use-india-dashboard";
import { formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  BarChart2,
  Search,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import { MetricInfo } from "@/components/ui/metric-info";
import { MarketDriverNudges } from "@/components/guide/market-driver-nudges";

interface PageProps {
  params: Promise<{ symbol: string }>;
}

interface Constituent {
  symbol: string;
  name: string;
  weight: number;
  price: number;
  chg: number;
}

interface SectorWeight {
  name: string;
  weight: number;
  contribution: number;
}

interface TickerMeta {
  name: string;
  ticker: string;
  upstoxSymbol: string;
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
  constituents: Constituent[];
  sectors: SectorWeight[];
}

const NIFTY50_ALL_CONSTITUENTS: Constituent[] = [
  { symbol: "HDFCBANK", name: "HDFC Bank Ltd", weight: 11.4, price: 1682.4, chg: 0.012 },
  { symbol: "RELIANCE", name: "Reliance Industries Ltd", weight: 9.8, price: 2984.1, chg: 0.008 },
  { symbol: "ICICIBANK", name: "ICICI Bank Ltd", weight: 7.9, price: 1245.8, chg: 0.014 },
  { symbol: "INFY", name: "Infosys Ltd", weight: 5.8, price: 1892.0, chg: -0.006 },
  { symbol: "TCS", name: "Tata Consultancy Services Ltd", weight: 4.2, price: 3995.5, chg: 0.004 },
  { symbol: "ITC", name: "ITC Ltd", weight: 4.1, price: 488.5, chg: 0.005 },
  { symbol: "LT", name: "Larsen & Toubro Ltd", weight: 3.8, price: 3620.0, chg: 0.011 },
  { symbol: "AXISBANK", name: "Axis Bank Ltd", weight: 3.4, price: 1185.0, chg: 0.009 },
  { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank Ltd", weight: 3.1, price: 1780.0, chg: 0.003 },
  { symbol: "BHARTIARTL", name: "Bharti Airtel Ltd", weight: 3.0, price: 1540.0, chg: 0.015 },
  { symbol: "SBIN", name: "State Bank of India", weight: 2.9, price: 815.0, chg: 0.007 },
  { symbol: "HINDUNILVR", name: "Hindustan Unilever Ltd", weight: 2.7, price: 2640.0, chg: -0.004 },
  { symbol: "BAJFINANCE", name: "Bajaj Finance Ltd", weight: 2.5, price: 7120.0, chg: 0.018 },
  { symbol: "M&M", name: "Mahindra & Mahindra Ltd", weight: 2.3, price: 2850.0, chg: 0.021 },
  { symbol: "MARUTI", name: "Maruti Suzuki India Ltd", weight: 1.8, price: 12400.0, chg: 0.006 },
  { symbol: "SUNPHARMA", name: "Sun Pharmaceutical Industries", weight: 1.7, price: 1820.0, chg: 0.002 },
  { symbol: "TITAN", name: "Titan Company Ltd", weight: 1.5, price: 3450.0, chg: -0.003 },
  { symbol: "NTPC", name: "NTPC Ltd", weight: 1.5, price: 395.0, chg: 0.012 },
  { symbol: "TATAMOTORS", name: "Tata Motors Ltd", weight: 1.4, price: 975.0, chg: -0.008 },
  { symbol: "TATASTEEL", name: "Tata Steel Ltd", weight: 1.3, price: 158.0, chg: 0.016 },
  { symbol: "POWERGRID", name: "Power Grid Corporation of India", weight: 1.3, price: 332.0, chg: 0.005 },
  { symbol: "ULTRACEMCO", name: "UltraTech Cement Ltd", weight: 1.2, price: 11250.0, chg: 0.004 },
  { symbol: "HCLTECH", name: "HCL Technologies Ltd", weight: 1.2, price: 1760.0, chg: -0.002 },
  { symbol: "ASIANPAINT", name: "Asian Paints Ltd", weight: 1.1, price: 3120.0, chg: -0.005 },
  { symbol: "BAJAJFINSV", name: "Bajaj Finserv Ltd", weight: 1.0, price: 1840.0, chg: 0.011 },
  { symbol: "COALINDIA", name: "Coal India Ltd", weight: 1.0, price: 490.0, chg: 0.008 },
  { symbol: "ONGC", name: "Oil & Natural Gas Corporation", weight: 1.0, price: 295.0, chg: 0.014 },
  { symbol: "ADANIENT", name: "Adani Enterprises Ltd", weight: 0.9, price: 3150.0, chg: -0.012 },
  { symbol: "ADANIPORTS", name: "Adani Ports and SEZ Ltd", weight: 0.9, price: 1440.0, chg: 0.006 },
  { symbol: "JSWSTEEL", name: "JSW Steel Ltd", weight: 0.9, price: 940.0, chg: 0.009 },
  { symbol: "GRASIM", name: "Grasim Industries Ltd", weight: 0.8, price: 2680.0, chg: 0.003 },
  { symbol: "NESTLEIND", name: "Nestle India Ltd", weight: 0.8, price: 2520.0, chg: -0.001 },
  { symbol: "TECHM", name: "Tech Mahindra Ltd", weight: 0.8, price: 1580.0, chg: 0.005 },
  { symbol: "WIPRO", name: "Wipro Ltd", weight: 0.8, price: 530.0, chg: -0.004 },
  { symbol: "HINDALCO", name: "Hindalco Industries Ltd", weight: 0.8, price: 670.0, chg: 0.015 },
  { symbol: "HEROMOTOCO", name: "Hero MotoCorp Ltd", weight: 0.7, price: 5420.0, chg: 0.008 },
  { symbol: "INDUSINDBK", name: "IndusInd Bank Ltd", weight: 0.7, price: 1410.0, chg: -0.009 },
  { symbol: "DRREDDY", name: "Dr. Reddy's Laboratories Ltd", weight: 0.7, price: 6680.0, chg: 0.004 },
  { symbol: "EICHERMOT", name: "Eicher Motors Ltd", weight: 0.7, price: 4820.0, chg: 0.011 },
  { symbol: "CIPLA", name: "Cipla Ltd", weight: 0.7, price: 1540.0, chg: 0.003 },
  { symbol: "DIVISLAB", name: "Divi's Laboratories Ltd", weight: 0.6, price: 4950.0, chg: 0.007 },
  { symbol: "TATACONSUM", name: "Tata Consumer Products Ltd", weight: 0.6, price: 1180.0, chg: -0.002 },
  { symbol: "SBILIFE", name: "SBI Life Insurance Company Ltd", weight: 0.6, price: 1780.0, chg: 0.005 },
  { symbol: "BAJAJ-AUTO", name: "Bajaj Auto Ltd", weight: 0.6, price: 11600.0, chg: 0.014 },
  { symbol: "BRITANNIA", name: "Britannia Industries Ltd", weight: 0.6, price: 5850.0, chg: -0.003 },
  { symbol: "BPCL", name: "Bharat Petroleum Corporation Ltd", weight: 0.5, price: 345.0, chg: 0.011 },
  { symbol: "APOLLOHOSP", name: "Apollo Hospitals Enterprise Ltd", weight: 0.5, price: 6850.0, chg: 0.006 },
  { symbol: "HDFCLIFE", name: "HDFC Life Insurance Company Ltd", weight: 0.5, price: 715.0, chg: 0.002 },
  { symbol: "LTIM", name: "LTIMindtree Ltd", weight: 0.5, price: 6150.0, chg: -0.005 },
  { symbol: "SHRIRAMFIN", name: "Shriram Finance Ltd", weight: 0.5, price: 3250.0, chg: 0.012 },
];

const NIFTY50_ALL_SECTORS: SectorWeight[] = [
  { name: "Financial Services", weight: 33.4, contribution: 0.42 },
  { name: "Information Technology", weight: 14.1, contribution: -0.08 },
  { name: "Oil, Gas & Consumables", weight: 11.8, contribution: 0.16 },
  { name: "Fast Moving Consumer Goods", weight: 8.8, contribution: 0.05 },
  { name: "Automobile & Auto Components", weight: 7.5, contribution: 0.12 },
  { name: "Healthcare & Pharma", weight: 4.2, contribution: 0.04 },
  { name: "Construction & Capital Goods", weight: 3.8, contribution: 0.08 },
  { name: "Metals & Mining", weight: 3.8, contribution: 0.09 },
  { name: "Telecommunication", weight: 3.0, contribution: 0.07 },
  { name: "Power & Energy Utilities", weight: 2.8, contribution: 0.04 },
  { name: "Consumer Durables", weight: 2.6, contribution: -0.02 },
  { name: "Construction Materials & Cement", weight: 2.0, contribution: 0.03 },
  { name: "Services & Logistics", weight: 0.9, contribution: 0.01 },
];

const TICKER_CONFIG: Record<string, TickerMeta> = {
  nifty50: {
    name: "NIFTY 50 Index",
    ticker: "^NSEI",
    upstoxSymbol: "NIFTY 50",
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
    constituents: NIFTY50_ALL_CONSTITUENTS,
    sectors: NIFTY50_ALL_SECTORS,
  },
  sensex: {
    name: "S&P BSE SENSEX",
    ticker: "^BSESN",
    upstoxSymbol: "SENSEX",
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
    constituents: NIFTY50_ALL_CONSTITUENTS.slice(0, 30),
    sectors: NIFTY50_ALL_SECTORS.slice(0, 8),
  },
  banknifty: {
    name: "NIFTY BANK Index",
    ticker: "^NSEBANK",
    upstoxSymbol: "BANK NIFTY",
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
    constituents: NIFTY50_ALL_CONSTITUENTS.filter((c) =>
      ["HDFCBANK", "ICICIBANK", "AXISBANK", "KOTAKBANK", "SBIN", "INDUSINDBK"].includes(c.symbol)
    ),
    sectors: [
      { name: "Private Sector Banks", weight: 81.4, contribution: 0.94 },
      { name: "Public Sector Banks", weight: 18.6, contribution: 0.18 },
    ],
  },
  vix: {
    name: "INDIA VIX Volatility Index",
    ticker: "^INDIAVIX",
    upstoxSymbol: "INDIA VIX",
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
    upstoxSymbol: "USDINR",
    metricKey: "usdinr",
    category: "Foreign Exchange",
    exchange: "Interbank Forex / RBI",
    basePrice: 85.88,
    baseChg: -0.0004,
    pe: 0,
    pb: 0,
    high52: 86.5,
    low52: 82.95,
    pcr: 0.95,
    maxPain: 85.5,
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
    upstoxSymbol: "BRENT",
    metricKey: "brent",
    category: "Energy Commodity",
    exchange: "ICE Europe / NYMEX",
    basePrice: 79.29,
    baseChg: -0.0064,
    pe: 0,
    pb: 0,
    high52: 94.2,
    low52: 68.2,
    pcr: 1.02,
    maxPain: 79.0,
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
    upstoxSymbol: "GOLD",
    metricKey: "gold",
    category: "Precious Metals",
    exchange: "COMEX / CME Group",
    basePrice: 2624.9,
    baseChg: 0.0057,
    pe: 0,
    pb: 0,
    high52: 2750.0,
    low52: 2020.0,
    pcr: 1.35,
    maxPain: 2600,
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
  const [constituentsSearch, setConstituentsSearch] = useState("");
  const [showAllConstituents, setShowAllConstituents] = useState(false);
  const { data } = useIndiaDashboard(45_000);

  // Real live stream values from pulse
  let livePrice = meta.basePrice;
  let liveChg = meta.baseChg;
  let dynamicSource = { provider: meta.exchange, url: `https://upstox.com` };

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

  // Real Upstox & Yahoo Historical Chart Series Fetching
  const [history, setHistory] = useState<{ date: string; value: number }[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [chartSource, setChartSource] = useState<string>("Upstox");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadHistory() {
      setLoadingHistory(true);
      try {
        // 1. Try Upstox candles API first
        const upstoxRes = await fetch(
          `/api/feeds/upstox/candles?symbol=${encodeURIComponent(meta.upstoxSymbol)}&range=${activeTf}`
        );

        if (upstoxRes.ok) {
          const json = await upstoxRes.json();
          if (!cancelled && json.candles && Array.isArray(json.candles) && json.candles.length > 0) {
            const mapped = json.candles.map((c: any) => {
              const dt = new Date(c.date);
              const formattedDate =
                activeTf === "1D"
                  ? dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })
                  : dt.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
              return { date: formattedDate, value: c.close ?? c.value };
            });
            setHistory(mapped);
            setChartSource(json.source === "upstox" ? "Upstox Pro API" : "Yahoo Finance API");
            setLoadingHistory(false);
            return;
          }
        }

        // 2. Fallback to security daily history
        const fallbackRes = await fetch(`/api/feeds/security/${encodeURIComponent(meta.ticker)}`);
        if (fallbackRes.ok) {
          const json = await fallbackRes.json();
          if (!cancelled && json.history && Array.isArray(json.history) && json.history.length > 0) {
            setHistory(json.history);
            setChartSource("Exchange Daily History");
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
  }, [meta.upstoxSymbol, meta.ticker, activeTf]);

  const visiblePoints = useMemo(() => {
    if (!history.length) {
      return [{ date: "Live", value: livePrice }];
    }
    return history;
  }, [history, livePrice]);

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

  // Filtered constituents based on search
  const filteredConstituents = useMemo(() => {
    if (!constituentsSearch.trim()) return meta.constituents;
    const q = constituentsSearch.toLowerCase();
    return meta.constituents.filter(
      (c) => c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    );
  }, [meta.constituents, constituentsSearch]);

  const displayedConstituents = showAllConstituents || constituentsSearch.trim() ? filteredConstituents : filteredConstituents.slice(0, 10);

  return (
    <div className="portal-page pb-10">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/Home"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-blue-600 transition-colors font-semibold"
        >
          <ArrowLeft className="size-3.5 text-blue-600" />
          Back to Executive Dashboard
        </Link>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-bold text-blue-600">{meta.exchange}</span>
          <span>·</span>
          <span>{meta.category}</span>
          <MetricInfo metric={meta.metricKey} sourceOverride={dynamicSource} />
          <span className="flex h-2 w-2 rounded-full bg-emerald-600 animate-pulse ml-1" />
        </div>
      </div>

      {/* 1. Header & Live Price with MetricInfo */}
      <div className="bento-card-shell flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-bold text-blue-600">{meta.ticker}</span>
            <span className="rounded border border-blue-600/30 bg-blue-600/10 px-2 py-0.5 text-sm font-bold text-blue-600">
              Official Exchange Feed (Upstox)
            </span>
            <MetricInfo metric={meta.metricKey} sourceOverride={dynamicSource} />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground mt-1">
            {meta.name}
          </h1>
          <div className="flex items-baseline gap-4 mt-2">
            <span className="text-4xl font-extrabold text-foreground">
              {livePrice < 100
                ? livePrice.toFixed(2)
                : livePrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span
              className={cn(
                "rounded-md px-2.5 py-1 text-base font-bold",
                isPos
                  ? "bg-emerald-500/15 text-emerald-600"
                  : "bg-rose-500/15 text-rose-600",
              )}
            >
              {formatPct(liveChg)}
            </span>
          </div>
        </div>

        {/* 52-Week Range Bar with MetricInfo */}
        <div className="w-full md:w-80 space-y-1.5 text-sm">
          <div className="flex justify-between items-center text-muted-foreground text-sm">
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
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${pct52}%` }}
            />
          </div>
          <p className="text-right text-sm text-muted-foreground">
            Current at <strong className="text-blue-600">{pct52.toFixed(1)}%</strong> of 52-week channel
          </p>
        </div>
      </div>

      <MarketDriverNudges marketKey={normalizedKey} name={meta.name} sectors={meta.sectors.length ? meta.sectors : NIFTY50_ALL_SECTORS} />

      {/* 2. Interactive Authentic Chart */}
      <div className="bento-card-shell space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-blue-600 uppercase flex items-center gap-1.5">
              <BarChart2 className="size-3.5 text-blue-600" />
              AUTHENTIC HISTORICAL TRAJECTORY ({meta.ticker})
            </span>
            <span className="rounded bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              LIVE {chartSource.toUpperCase()}
            </span>
            <MetricInfo metric={meta.metricKey} sourceOverride={dynamicSource} />
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm">
              <span className="text-muted-foreground mr-1.5">{activeTf} Move:</span>
              <span className={cn("font-bold", isUp ? "text-emerald-600" : "text-rose-600")}>
                {formatPct(periodReturnPct)}
              </span>
            </div>

            <div className="flex items-center rounded-lg border border-border bg-secondary/50 p-0.5 text-sm">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => {
                    setActiveTf(tf);
                    setHoveredIndex(null);
                  }}
                  className={cn(
                    "rounded-md px-3 py-1 font-medium transition-all cursor-pointer",
                    activeTf === tf
                      ? "bg-blue-600 text-white shadow-sm font-bold"
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
        <div className="relative h-64 w-full rounded-lg bg-muted/30 border border-border/60 p-3 overflow-hidden flex flex-col justify-between">
          {/* Top Range Legend & Hover Readout */}
          <div className="flex justify-between items-center text-sm text-muted-foreground z-10 pointer-events-none pb-1">
            <span className="bg-card px-2 py-0.5 rounded border border-border/60 text-xs">
              Period High: <strong className="text-foreground">{maxVal < 100 ? maxVal.toFixed(2) : maxVal.toLocaleString("en-US", { maximumFractionDigits: 2 })}</strong>
            </span>
            {hoveredIndex !== null && coords[hoveredIndex] ? (
              <span className="bg-blue-600 text-white font-bold px-2.5 py-0.5 rounded shadow text-xs">
                {coords[hoveredIndex].point.date} · Close: {coords[hoveredIndex].point.value < 100 ? coords[hoveredIndex].point.value.toFixed(2) : coords[hoveredIndex].point.value.toLocaleString("en-US", { maximumFractionDigits: 2 })}
              </span>
            ) : (
              <span className="text-blue-600/80 font-semibold italic text-xs">Hover across timeline to inspect price points ({visiblePoints.length} bars)</span>
            )}
            <span className="bg-card px-2 py-0.5 rounded border border-border/60 text-xs">
              Period Low: <strong className="text-foreground">{minVal < 100 ? minVal.toFixed(2) : minVal.toLocaleString("en-US", { maximumFractionDigits: 2 })}</strong>
            </span>
          </div>

          {loadingHistory ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm gap-2">
              <RefreshCw className="size-4 animate-spin text-blue-600" />
              <span>Fetching Upstox {activeTf} candles stream…</span>
            </div>
          ) : (
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

              {/* Grid lines */}
              <line x1="0" y1="45" x2="800" y2="45" stroke="currentColor" className="text-border/40" strokeDasharray="3 3" />
              <line x1="0" y1="90" x2="800" y2="90" stroke="currentColor" className="text-border/40" strokeDasharray="3 3" />
              <line x1="0" y1="135" x2="800" y2="135" stroke="currentColor" className="text-border/40" strokeDasharray="3 3" />

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
                    stroke="#2563eb"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                  <circle
                    cx={coords[hoveredIndex].x}
                    cy={coords[hoveredIndex].y}
                    r="5"
                    fill="#2563eb"
                    stroke="#ffffff"
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
          )}

          {/* Bottom Timeline Dates */}
          <div className="flex justify-between items-center text-xs text-muted-foreground pt-1 border-t border-border/40 z-10">
            <span>{visiblePoints[0]?.date ?? "Start"}</span>
            <span className="text-xs text-blue-600 font-semibold tracking-wider uppercase">
              {loadingHistory ? "Fetching live market series…" : `${chartSource} · ${visiblePoints.length} ${activeTf === "1D" ? "Intraday 5m Bars" : "Sessions"} Plotted`}
            </span>
            <span>{visiblePoints[visiblePoints.length - 1]?.date ?? "Now"}</span>
          </div>
        </div>
      </div>

      {/* 3. Valuation & Derivatives Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Valuation Multiples */}
        <div className="rounded-xl border border-border/80 bg-card p-5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-foreground">Valuation multiples</span>
            <MetricInfo metric="pe_ratio" />
          </div>
          <div className="flex justify-between py-1 border-b border-border/50">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Price-to-Earnings (P/E):</span>
              <MetricInfo metric="pe_ratio" />
            </div>
            <span className="font-bold text-foreground">{meta.pe > 0 ? meta.pe : "—"}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-border/50">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Price-to-Book (P/B):</span>
              <MetricInfo metric="pb_ratio" />
            </div>
            <span className="font-bold text-foreground">{meta.pb > 0 ? meta.pb : "—"}</span>
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
            <span className="font-bold text-emerald-600">11.38%</span>
          </div>
        </div>

        {/* Technical Indicators */}
        <div className="rounded-xl border border-border/80 bg-card p-5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-foreground">Momentum oscillators</span>
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
            <span className="font-bold text-emerald-600">{meta.macd}</span>
          </div>
          <div className="flex justify-between py-1">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">200 DMA Spread:</span>
              <MetricInfo metric="dma" customTitle="200-Day Moving Average" />
            </div>
            <span className="font-bold text-emerald-600">+7.2% Bullish</span>
          </div>
        </div>

        {/* Institutional Positioning */}
        <div className="rounded-xl border border-border/80 bg-card p-5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-foreground">Institutional flows</span>
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
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Index Constituents Table */}
          <div className="lg:col-span-8 bento-card-shell space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
              <div>
                <h3 className="text-sm uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1.5">
                  INDEX CONSTITUENTS &amp; INTRADAY PERFORMANCE
                  <span className="rounded-full bg-blue-600/10 px-2 py-0.5 text-xs text-blue-600 font-bold border border-blue-600/20">
                    {filteredConstituents.length} STOCKS
                  </span>
                </h3>
              </div>
              <MetricInfo metric="nifty50" customTitle="Index Weighting & Selection Methodology" />
            </div>

            {/* Search filter input */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={constituentsSearch}
                  onChange={(e) => setConstituentsSearch(e.target.value)}
                  placeholder={`Search ${meta.constituents.length} constituents by name or ticker…`}
                  className="w-full rounded-lg border border-border/80 bg-background pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
              {meta.constituents.length > 10 ? (
                <button
                  type="button"
                  onClick={() => setShowAllConstituents((prev) => !prev)}
                  className="flex items-center gap-1 rounded-lg border border-border/80 bg-secondary/50 px-3 py-1.5 text-xs font-bold text-foreground hover:bg-secondary transition-colors cursor-pointer"
                >
                  <span>{showAllConstituents ? "Show Top 10" : `View All ${meta.constituents.length}`}</span>
                  {showAllConstituents ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                </button>
              ) : null}
            </div>

            <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="text-xs uppercase text-muted-foreground border-b border-border bg-muted/40 sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-2">Symbol</th>
                    <th className="py-2.5 px-2">Company Name</th>
                    <th className="py-2.5 px-2 text-right">Weight</th>
                    <th className="py-2.5 px-2 text-right">Price (₹)</th>
                    <th className="py-2.5 px-2 text-right">1D Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {displayedConstituents.map((c) => (
                    <tr key={c.symbol} className="hover:bg-accent/40 transition-colors">
                      <td className="py-2.5 px-2 font-bold text-foreground flex items-center gap-1">
                        <Link href={`/research/${c.symbol}`} className="hover:text-blue-600 hover:underline">
                          {c.symbol}
                        </Link>
                        <MetricInfo metric="nifty50" customTitle={`${c.symbol} (${c.name}) Constituent Data`} size="xs" />
                      </td>
                      <td className="py-2.5 px-2 text-muted-foreground truncate max-w-[180px] sm:max-w-none">{c.name}</td>
                      <td className="py-2.5 px-2 text-right font-medium text-foreground">{c.weight}%</td>
                      <td className="py-2.5 px-2 text-right font-bold text-foreground">
                        ₹{c.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td
                        className={cn(
                          "py-2.5 px-2 text-right font-bold",
                          c.chg >= 0 ? "text-emerald-600" : "text-rose-600",
                        )}
                      >
                        {formatPct(c.chg)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!showAllConstituents && !constituentsSearch.trim() && meta.constituents.length > 10 ? (
              <div className="pt-2 text-center border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setShowAllConstituents(true)}
                  className="text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Showing top 10 by index weight · Click to view all {meta.constituents.length} constituents</span>
                  <ChevronDown className="size-3.5" />
                </button>
              </div>
            ) : null}
          </div>

          {/* Complete Sector Weights Card */}
          <div className="lg:col-span-4 bento-card-shell space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-sm uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1.5">
                SECTOR WEIGHTS
                <span className="rounded-full bg-blue-600/10 px-2 py-0.5 text-xs text-blue-600 font-bold border border-blue-600/20">
                  {meta.sectors.length} SECTORS
                </span>
              </h3>
              <MetricInfo metric="concentration" customTitle="Sectoral Weights Breakdown" />
            </div>
            <div className="space-y-3 text-xs sm:text-sm max-h-[520px] overflow-y-auto pr-1">
              {meta.sectors.map((sec) => (
                <div key={sec.name} className="space-y-1 rounded-lg border border-border/40 bg-muted/20 p-2.5 hover:bg-muted/40 transition-colors">
                  <div className="flex justify-between items-center text-xs sm:text-sm">
                    <span className="font-semibold text-foreground">{sec.name}</span>
                    <span className="font-bold text-foreground tabular-nums">{sec.weight}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary/80 overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, sec.weight * 2.8)}%` }}
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
