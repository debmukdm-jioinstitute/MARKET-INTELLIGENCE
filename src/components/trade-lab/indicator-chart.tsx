"use client";

import {
  CandlestickSeries,
  ColorType,
  HistogramSeries,
  LineSeries,
  LineStyle,
  createChart,
  type IChartApi,
  type LogicalRange,
  type UTCTimestamp,
} from "lightweight-charts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import {
  CHART_INDICATORS,
  DEFAULT_CHART_INDICATORS,
  computeIndicator,
  isAvailable,
  type ChartIndicatorKey,
} from "@/lib/trade-lab/chart-indicators";
import { TIMEFRAMES, type Timeframe } from "@/lib/trade-lab/types";
import type { Bar } from "@/lib/scanner/types";
import { cn } from "@/lib/utils";

type BarsResponse = { symbol: string; label: string; tf: Timeframe; intraday: boolean; hasVolume: boolean; source: string; bars: Bar[] };

const UP = "#059669";
const DOWN = "#e11d48";
const IST = 19_800; // shift so the axis reads in IST
const STORAGE_KEY = "mi-chart-indicators";
const VALID = new Set<string>(CHART_INDICATORS.map((i) => i.key));

async function fetchBars(url: string): Promise<BarsResponse> {
  const res = await fetch(url);
  const body = (await res.json().catch(() => ({}))) as BarsResponse & { error?: string };
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
  return body;
}

function readSaved(): ChartIndicatorKey[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? (arr.filter((k): k is ChartIndicatorKey => typeof k === "string" && VALID.has(k))) : null;
  } catch {
    return null;
  }
}

/**
 * TradingView-style chart: candles + volume from lightweight-charts, with any mix of indicators the
 * reader ticks in the dropdown. Overlays (EMA, Bollinger, Supertrend...) draw on the price pane;
 * oscillators (MACD, RSI...) get stacked sub-panes. Indicators are computed client-side from the
 * bars, with the same formulas the Trade Lab verdict cards use, and the bars refresh live.
 */
export function IndicatorChart({
  symbol,
  tf = "1d",
  height = 460,
  refreshMs = 60_000,
  /** When set, these replace the saved selection (e.g. Trade Lab card click). */
  forceIndicators,
  onTfChange,
  showTfPicker = true,
}: {
  symbol: string;
  tf?: Timeframe;
  height?: number;
  refreshMs?: number;
  forceIndicators?: ChartIndicatorKey[];
  onTfChange?: (tf: Timeframe) => void;
  showTfPicker?: boolean;
}) {
  const [selected, setSelected] = useState<ChartIndicatorKey[]>(DEFAULT_CHART_INDICATORS);
  const [menuOpen, setMenuOpen] = useState(false);
  const [localTf, setLocalTf] = useState<Timeframe>(tf);
  const activeTf = onTfChange ? tf : localTf;
  const menuRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rangeRef = useRef<{ key: string; range: LogicalRange | null }>({ key: "", range: null });

  useEffect(() => {
    const saved = readSaved();
    if (saved?.length) setSelected(saved);
  }, []);

  // Compare by content so a parent re-render with an equal list doesn't wipe the reader's dropdown picks.
  const forceSig = forceIndicators ? forceIndicators.join(",") : null;
  useEffect(() => {
    if (forceSig !== null) setSelected(forceSig ? (forceSig.split(",") as ChartIndicatorKey[]) : []);
  }, [forceSig]);

  const persist = useCallback((next: ChartIndicatorKey[]) => {
    setSelected(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* private mode */ }
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  const { data, error, isLoading } = useSWR<BarsResponse>(
    `/api/trade/bars?symbol=${encodeURIComponent(symbol)}&tf=${activeTf}`,
    fetchBars,
    { refreshInterval: refreshMs, revalidateOnFocus: false, keepPreviousData: true, shouldRetryOnError: false },
  );

  const available = useMemo(
    () => CHART_INDICATORS.filter((m) => !data || isAvailable(m, data.intraday, data.hasVolume)),
    [data],
  );
  const plotted = useMemo(() => selected.filter((k) => available.some((m) => m.key === k)), [selected, available]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !data?.bars.length) return;

    const bars = data.bars;
    const outputs = plotted.map((k) => computeIndicator(k, bars)).filter((o): o is NonNullable<typeof o> => o !== null);
    const metaOf = (k: ChartIndicatorKey) => CHART_INDICATORS.find((m) => m.key === k)!;
    const paneOutputs = outputs.filter((o) => metaOf(o.key).kind === "pane");
    const overlayOutputs = outputs.filter((o) => metaOf(o.key).kind === "overlay");
    const total = height + paneOutputs.length * 130;

    const chart: IChartApi = createChart(container, {
      width: container.clientWidth,
      height: total,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#57534e", fontSize: 11, panes: { separatorColor: "#e7e5e4" } },
      grid: { vertLines: { color: "#f5f5f4" }, horzLines: { color: "#f5f5f4" } },
      rightPriceScale: { borderColor: "#e7e5e4" },
      timeScale: { borderColor: "#e7e5e4", timeVisible: data.intraday, secondsVisible: false },
      crosshair: { mode: 0 },
    });

    const time = (t: number) => (t + IST) as UTCTimestamp;
    const candle = chart.addSeries(CandlestickSeries, { upColor: UP, downColor: DOWN, borderVisible: false, wickUpColor: UP, wickDownColor: DOWN });
    candle.setData(bars.map((b) => ({ time: time(b.t), open: b.o, high: b.h, low: b.l, close: b.c })));

    if (data.hasVolume) {
      const vol = chart.addSeries(HistogramSeries, { priceFormat: { type: "volume" }, priceScaleId: "vol", lastValueVisible: false, priceLineVisible: false });
      vol.priceScale().applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
      vol.setData(bars.map((b) => ({ time: time(b.t), value: b.v, color: b.c >= b.o ? `${UP}44` : `${DOWN}44` })));
    }

    const toPoints = (values: number[]) =>
      values.flatMap((v, i) => (Number.isFinite(v) ? [{ time: time(bars[i].t), value: v }] : []));

    for (const o of overlayOutputs) {
      for (const l of o.lines) {
        chart.addSeries(LineSeries, { color: l.color, lineWidth: l.width ?? 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false, title: l.name, ...(l.dots ? { lineVisible: false, pointMarkersVisible: true, pointMarkersRadius: 1.5 } : {}) }, 0).setData(toPoints(l.values));
      }
    }

    paneOutputs.forEach((o, idx) => {
      const pane = idx + 1;
      if (o.hist) {
        const h = chart.addSeries(HistogramSeries, { priceLineVisible: false, lastValueVisible: false }, pane);
        h.setData(o.hist.values.flatMap((v, i) => (Number.isFinite(v) ? [{ time: time(bars[i].t), value: v, color: v >= 0 ? o.hist!.upColor : o.hist!.downColor }] : [])));
      }
      o.lines.forEach((l, li) => {
        const s = chart.addSeries(LineSeries, { color: l.color, lineWidth: l.width ?? 1, priceLineVisible: false, lastValueVisible: li === 0, title: l.name }, pane);
        s.setData(toPoints(l.values));
        if (li === 0) {
          for (const lvl of o.levels ?? []) {
            s.createPriceLine({ price: lvl, color: "#a8a29e", lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false, title: "" });
          }
        }
      });
    });

    const panes = chart.panes();
    panes[0]?.setStretchFactor(3);
    for (let i = 1; i < panes.length; i++) panes[i].setStretchFactor(1);

    const key = `${data.symbol}:${data.tf}`;
    const saved = rangeRef.current;
    if (saved.key === key && saved.range) chart.timeScale().setVisibleLogicalRange(saved.range);
    else chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, bars.length - 120), to: bars.length + 4 });

    const resize = new ResizeObserver(() => chart.applyOptions({ width: container.clientWidth }));
    resize.observe(container);

    return () => {
      rangeRef.current = { key, range: chart.timeScale().getVisibleLogicalRange() };
      resize.disconnect();
      chart.remove();
    };
  }, [data, plotted, height]);

  const toggle = (k: ChartIndicatorKey) =>
    persist(selected.includes(k) ? selected.filter((x) => x !== k) : [...selected, k]);

  const groups = (["Trend", "Momentum", "Volatility", "Volume"] as const).map((g) => ({ g, items: available.filter((m) => m.group === g) })).filter((x) => x.items.length);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div ref={menuRef} className="relative">
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
            className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 text-sm font-medium text-stone-800 shadow-sm hover:bg-stone-50"
          >
            Indicators
            <span className="rounded-full bg-teal-600 px-1.5 text-[11px] font-semibold text-white">{plotted.length}</span>
            <span aria-hidden className="text-stone-400">▾</span>
          </button>
          {menuOpen ? (
            <div className="absolute left-0 z-30 mt-1 max-h-80 w-72 overflow-y-auto rounded-xl border border-stone-200 bg-white p-2 shadow-lg" role="listbox" aria-multiselectable>
              <div className="flex items-center justify-between px-2 pb-1 text-xs text-stone-500">
                <span>Pick as many as you like</span>
                <button type="button" onClick={() => persist([])} className="font-semibold text-teal-700 hover:underline">Clear all</button>
              </div>
              {groups.map(({ g, items }) => (
                <div key={g} className="py-1">
                  <div className="px-2 pb-0.5 text-[11px] font-semibold uppercase tracking-wide text-stone-400">{g}</div>
                  {items.map((m) => (
                    <label key={m.key} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-stone-800 hover:bg-stone-50">
                      <input type="checkbox" checked={selected.includes(m.key)} onChange={() => toggle(m.key)} className="accent-teal-600" />
                      <span className="flex-1">{m.label}</span>
                      <span className="text-[10px] text-stone-400">{m.kind === "overlay" ? "on price" : "own pane"}</span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {showTfPicker ? (
          <div className="inline-flex overflow-hidden rounded-lg border border-stone-300 bg-white text-xs shadow-sm" role="group" aria-label="Timeframe">
            {TIMEFRAMES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => (onTfChange ? onTfChange(t.id) : setLocalTf(t.id))}
                className={cn("min-h-9 px-2.5 font-medium", activeTf === t.id ? "bg-teal-600 text-white" : "text-stone-700 hover:bg-stone-50")}
              >
                {t.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-1.5">
          {plotted.map((k) => (
            <button key={k} type="button" onClick={() => toggle(k)} title="Remove from chart" className="inline-flex items-center gap-1 rounded-full border border-teal-600/30 bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-800 hover:bg-teal-100">
              {CHART_INDICATORS.find((m) => m.key === k)?.label} <span aria-hidden>×</span>
            </button>
          ))}
        </div>
      </div>

      {error && !data ? <p className="text-sm text-rose-600">{error.message}</p> : null}
      {isLoading && !data ? <p className="text-sm text-stone-500">Loading chart…</p> : null}
      <div ref={containerRef} className="w-full" />
      {data ? (
        <p className="text-[11px] text-stone-500">
          {data.label} · {data.tf} · {data.bars.length} bars · source {data.source} · refreshes about every {Math.round(refreshMs / 1000)}s. Indicators are computed from the candles shown. Descriptive analytics only, not investment advice.
        </p>
      ) : null}
    </div>
  );
}
