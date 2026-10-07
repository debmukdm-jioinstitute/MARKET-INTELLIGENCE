"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, BarChart2, RefreshCw } from "lucide-react";
import { IndexConstituentsPanel } from "@/components/india-markets/index-constituents-panel";
import { MarketStatusBadge } from "@/components/feeds/market-status-badge";
import { useFeedHub } from "@/hooks/use-feed-hub";
import { useMarketStatus } from "@/hooks/use-market-status";
import { formatPct } from "@/lib/format";
import { fmtNum } from "@/lib/format-india";
import { cn } from "@/lib/utils";

/** Module-level fetcher (repo rule: never inline an async fetcher in a hook body). */
const fetchJson = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
};

const TIMEFRAMES = ["1D", "1W", "1M", "1Y"] as const;
type Timeframe = (typeof TIMEFRAMES)[number];

type HistoryPoint = { date: string; value: number };

type SecurityDetail = {
  details?: { fiftyTwoWeekHigh?: number; fiftyTwoWeekLow?: number };
  history?: HistoryPoint[];
};

function AnimatedPrice({ value, format }: { value: number; format: (v: number) => string }) {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    const from = fromRef.current;
    if (from === value || reduceMotion) {
      fromRef.current = value;
      setDisplay(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const duration = 700;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (value - from) * eased);
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduceMotion]);

  return <span className="tabular-nums">{format(value === display ? value : display)}</span>;
}

export function IndexDetailClient({
  slug,
  label,
  name,
  yahoo,
  upstoxKey,
}: {
  slug: string;
  label: string;
  name: string;
  yahoo: string;
  upstoxKey?: string;
}) {
  const reduceMotion = useReducedMotion();
  const { data: feedData } = useFeedHub(30_000);
  const { isOpen } = useMarketStatus();
  const [activeTf, setActiveTf] = useState<Timeframe>("1D");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const quote = useMemo(
    () => feedData?.indices.find((q) => q.symbol === label || q.symbol === yahoo) ?? null,
    [feedData, label, yahoo],
  );
  const liveNow = isOpen && !quote?.stale;
  const quoteWord = liveNow ? "Live" : "Last close";

  const { data: secDetail } = useSWR<SecurityDetail>(
    `/api/feeds/security/${encodeURIComponent(yahoo)}`,
    fetchJson,
    { revalidateOnFocus: false, dedupingInterval: 600_000 },
  );

  const high52 = secDetail?.details?.fiftyTwoWeekHigh ?? null;
  const low52 = secDetail?.details?.fiftyTwoWeekLow ?? null;
  const pct52 =
    high52 != null && low52 != null && high52 > low52 && quote
      ? Math.min(100, Math.max(0, ((quote.price - low52) / (high52 - low52)) * 100))
      : null;

  /* ------------------------- chart series ------------------------- */
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [chartSource, setChartSource] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingHistory(true);
      try {
        if (upstoxKey) {
          const r = await fetch(
            `/api/feeds/upstox/candles?symbol=${encodeURIComponent(upstoxKey)}&range=${activeTf}`,
          );
          if (r.ok) {
            const j = (await r.json()) as { candles?: Array<{ date: string; close?: number; value?: number }>; source?: string };
            if (!cancelled && j.candles?.length) {
              const mapped = j.candles.map((c) => {
                const dt = new Date(c.date);
                return {
                  date:
                    activeTf === "1D"
                      ? dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })
                      : dt.toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
                  value: c.close ?? c.value ?? 0,
                };
              });
              setHistory(mapped);
              setChartSource(j.source === "upstox" ? "Upstox" : "Yahoo Finance");
              return;
            }
          }
        }
        // Fallback: daily history from the security detail endpoint (Yahoo).
        const h = secDetail?.history;
        if (!cancelled && h?.length) {
          setHistory(h);
          setChartSource("Yahoo Finance · daily");
        } else if (!cancelled) {
          setHistory([]);
          setChartSource(null);
        }
      } catch {
        if (!cancelled) {
          setHistory([]);
          setChartSource(null);
        }
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [upstoxKey, activeTf, secDetail]);

  const chart = useMemo(() => {
    const pts = history;
    if (!pts.length) return null;
    const values = pts.map((p) => p.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;
    const width = 800;
    const height = 180;
    const padTop = 20;
    const padBottom = 25;
    const chartHeight = height - padTop - padBottom;
    const coords = pts.map((p, i) => ({
      x: pts.length > 1 ? (i / (pts.length - 1)) * width : width / 2,
      y: height - padBottom - ((p.value - minVal) / range) * chartHeight,
      point: p,
    }));
    const pathData = coords.reduce(
      (acc, c, i) => `${acc} ${i === 0 ? "M" : "L"} ${c.x.toFixed(1)},${c.y.toFixed(1)}`,
      "",
    );
    const areaData = `${pathData} L ${width},${height} L 0,${height} Z`;
    const start = pts[0]?.value ?? 0;
    const end = pts[pts.length - 1]?.value ?? 0;
    return {
      coords,
      pathData,
      areaData,
      minVal,
      maxVal,
      isUp: end >= start,
      periodReturnPct: start > 0 ? (end - start) / start : 0,
    };
  }, [history]);

  const fmtPrice = (v: number) =>
    v < 100 ? v.toFixed(2) : v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const entrance = (delay = 0) =>
    reduceMotion ? {} : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.45, delay } };

  return (
    <div className="portal-page space-y-5 pb-10">
      <div className="flex items-center justify-between">
        <Link
          href="/markets/india"
          className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-[#1a73e8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a73e8] rounded"
        >
          <ArrowLeft className="size-3.5 text-[#1a73e8]" />
          Back to India markets
        </Link>
        <MarketStatusBadge />
      </div>

      {/* Header */}
      <motion.div {...entrance(0)} className="bento-card-shell">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-bold text-[#1a73e8]">{yahoo}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-bold",
                  liveNow
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "bg-secondary text-muted-foreground",
                )}
              >
                {quoteWord}
                {quote?.stale ? " · delayed" : ""}
              </span>
            </div>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-foreground">{label}</h1>
            <p className="text-sm text-muted-foreground">{name}</p>
            {quote ? (
              <div className="mt-2 flex items-baseline gap-4">
                <span className="text-4xl font-extrabold text-foreground">
                  <AnimatedPrice value={quote.price} format={fmtPrice} />
                </span>
                <span
                  className={cn(
                    "rounded-md px-2.5 py-1 text-base font-bold",
                    quote.changePct >= 0
                      ? "bg-emerald-500/15 text-emerald-600"
                      : "bg-rose-500/15 text-rose-600",
                  )}
                >
                  {formatPct(quote.changePct)}
                </span>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Index quote unavailable right now — constituents below still load from their own feeds.
              </p>
            )}
          </div>

          {pct52 != null && high52 != null && low52 != null ? (
            <div className="w-full space-y-1.5 text-sm md:w-80">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>52W low {fmtNum(low52, 2)}</span>
                <span>52W high {fmtNum(high52, 2)}</span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary/80">
                <motion.div
                  className="h-full rounded-full bg-[#1a73e8]"
                  initial={reduceMotion ? false : { width: 0 }}
                  animate={{ width: `${pct52}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
              <p className="text-right text-muted-foreground">
                Now at <strong className="text-[#1a73e8]">{pct52.toFixed(1)}%</strong> of the 52-week range (Yahoo Finance)
              </p>
            </div>
          ) : null}
        </div>
      </motion.div>

      {/* Chart */}
      <motion.div {...entrance(0.08)} className="bento-card-shell space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-sm font-bold uppercase text-[#1a73e8]">
              <BarChart2 className="size-3.5" />
              Price history ({yahoo})
            </span>
            {chartSource ? (
              <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-600">
                {chartSource.toUpperCase()}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            {chart ? (
              <div className="text-sm">
                <span className="mr-1.5 text-muted-foreground">{activeTf} move:</span>
                <span className={cn("font-bold", chart.isUp ? "text-emerald-600" : "text-rose-600")}>
                  {formatPct(chart.periodReturnPct)}
                </span>
              </div>
            ) : null}
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
                    "cursor-pointer rounded-md px-3 py-1 font-medium transition-all",
                    activeTf === tf
                      ? "bg-[#1a73e8] font-bold text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="relative flex h-64 w-full flex-col justify-between overflow-hidden rounded-lg border border-border/60 bg-muted/30 p-3">
          {loadingHistory ? (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="size-4 animate-spin text-[#1a73e8]" />
              Fetching {activeTf} price series…
            </div>
          ) : chart ? (
            <>
              <div className="pointer-events-none z-10 flex items-center justify-between pb-1 text-sm text-muted-foreground">
                <span className="rounded border border-border/60 bg-card px-2 py-0.5 text-xs">
                  High <strong className="text-foreground">{fmtNum(chart.maxVal, 2)}</strong>
                </span>
                {hoveredIndex !== null && chart.coords[hoveredIndex] ? (
                  <span className="rounded bg-[#1a73e8] px-2.5 py-0.5 text-xs font-bold text-white shadow">
                    {chart.coords[hoveredIndex].point.date} · {fmtNum(chart.coords[hoveredIndex].point.value, 2)}
                  </span>
                ) : (
                  <span className="text-xs font-semibold italic text-[#1a73e8]/80">
                    Hover to inspect ({chart.coords.length} points)
                  </span>
                )}
                <span className="rounded border border-border/60 bg-card px-2 py-0.5 text-xs">
                  Low <strong className="text-foreground">{fmtNum(chart.minVal, 2)}</strong>
                </span>
              </div>
              <svg
                viewBox="0 0 800 180"
                className="h-full w-full overflow-visible"
                preserveAspectRatio="none"
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <defs>
                  <linearGradient id={`idx-chart-${slug}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chart.isUp ? "#10b981" : "#f43f5e"} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={chart.isUp ? "#10b981" : "#f43f5e"} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <line x1="0" y1="45" x2="800" y2="45" stroke="currentColor" className="text-border/40" strokeDasharray="3 3" />
                <line x1="0" y1="90" x2="800" y2="90" stroke="currentColor" className="text-border/40" strokeDasharray="3 3" />
                <line x1="0" y1="135" x2="800" y2="135" stroke="currentColor" className="text-border/40" strokeDasharray="3 3" />
                <motion.path
                  d={chart.areaData}
                  fill={`url(#idx-chart-${slug})`}
                  initial={reduceMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6 }}
                />
                <motion.path
                  d={chart.pathData}
                  fill="none"
                  stroke={chart.isUp ? "#10b981" : "#f43f5e"}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={reduceMotion ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
                {hoveredIndex !== null && chart.coords[hoveredIndex] ? (
                  <g>
                    <line
                      x1={chart.coords[hoveredIndex].x}
                      y1="0"
                      x2={chart.coords[hoveredIndex].x}
                      y2="180"
                      stroke="#1a73e8"
                      strokeWidth="1.5"
                      strokeDasharray="2 2"
                    />
                    <circle
                      cx={chart.coords[hoveredIndex].x}
                      cy={chart.coords[hoveredIndex].y}
                      r="5"
                      fill="#1a73e8"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                  </g>
                ) : null}
                {chart.coords.map((c, i) => {
                  const colWidth = 800 / Math.max(1, chart.coords.length);
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
              <div className="z-10 flex items-center justify-between border-t border-border/40 pt-1 text-xs text-muted-foreground">
                <span>{chart.coords[0]?.point.date ?? ""}</span>
                <span className="font-semibold uppercase tracking-wider text-[#1a73e8]">
                  {chartSource} · {chart.coords.length} {activeTf === "1D" ? "intraday" : "daily"} points
                </span>
                <span>{chart.coords[chart.coords.length - 1]?.point.date ?? ""}</span>
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Price history unavailable for this index right now.
            </div>
          )}
        </div>
        {!upstoxKey && chart ? (
          <p className="text-xs text-muted-foreground">
            Intraday candles are not published for this index — showing daily history.
          </p>
        ) : null}
      </motion.div>

      {/* Constituents */}
      <IndexConstituentsPanel slug={slug} />
    </div>
  );
}
