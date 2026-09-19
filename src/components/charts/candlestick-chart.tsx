"use client";

import type { Candle } from "@/lib/feeds/sources/upstox";
import {
  CandlestickSeries,
  ColorType,
  HistogramSeries,
  createChart,
  type IChartApi,
} from "lightweight-charts";
import { useEffect, useRef } from "react";

const UP = "#34d399";
const DOWN = "#fb7185";

/**
 * OHLC candlestick + volume chart via TradingView's lightweight-charts
 * (github.com/tradingview/lightweight-charts, Apache-2.0). Canvas-based —
 * chart creation happens in an effect, never at module/render scope, so it
 * needs no special SSR handling beyond staying a client component.
 */
export function CandlestickChart({ candles, height = 280 }: { candles: Candle[]; height?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#8b93a1",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.06)" },
        horzLines: { color: "rgba(255,255,255,0.06)" },
      },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.1)" },
      timeScale: { borderColor: "rgba(255,255,255,0.1)" },
      crosshair: { mode: 0 },
    });
    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: UP,
      downColor: DOWN,
      borderVisible: false,
      wickUpColor: UP,
      wickDownColor: DOWN,
    });
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

    const toTime = (ts: string) => ts.slice(0, 10);
    candleSeries.setData(
      candles.map((c) => ({ time: toTime(c.ts), open: c.open, high: c.high, low: c.low, close: c.close })),
    );
    volumeSeries.setData(
      candles.map((c) => ({
        time: toTime(c.ts),
        value: c.volume,
        color: c.close >= c.open ? `${UP}55` : `${DOWN}55`,
      })),
    );
    chart.timeScale().fitContent();

    const resize = new ResizeObserver(() => {
      chart.applyOptions({ width: container.clientWidth });
    });
    resize.observe(container);

    return () => {
      resize.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [candles, height]);

  return <div ref={containerRef} className="w-full" />;
}
