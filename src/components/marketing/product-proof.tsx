"use client";

import Link from "next/link";
import { useState } from "react";

/** Illustrative, hand-made series (normalised). Not market data — labelled as such in the UI. */
const SAMPLES = [
  {
    id: "RELIANCE",
    name: "Reliance Industries",
    series: [42, 45, 44, 48, 52, 50, 55, 58, 56, 61, 64, 63, 68],
    brief: [
      { text: "Momentum is above its 50-day average and volume is rising into the move.", cite: "NSE India · daily prices" },
      { text: "Valuation sits near the middle of its own multi-year range.", cite: "Company filings · exchange disclosures" },
      { text: "Watch crude and the rupee: both feed into refining margins.", cite: "RBI · FRED macro series" },
    ],
  },
  {
    id: "HDFCBANK",
    name: "HDFC Bank",
    series: [60, 58, 59, 55, 54, 56, 53, 55, 57, 56, 59, 61, 60],
    brief: [
      { text: "Price has been range-bound; no confirmed breakout on the daily chart.", cite: "NSE India · daily prices" },
      { text: "Sector breadth is mixed, so bank moves are stock-specific right now.", cite: "NSE India · sector indices" },
      { text: "Rate expectations matter most for net interest margin.", cite: "RBI · policy statements" },
    ],
  },
  {
    id: "TCS",
    name: "Tata Consultancy Services",
    series: [50, 52, 55, 54, 57, 59, 58, 60, 62, 61, 63, 62, 65],
    brief: [
      { text: "Steady uptrend with shallow pullbacks; relative strength is above the index.", cite: "NSE India · daily prices" },
      { text: "US demand and the dollar-rupee rate drive revenue outlook.", cite: "FRED · RBI reference rates" },
      { text: "Results dates can move the stock sharply; check the earnings calendar.", cite: "Exchange filings" },
    ],
  },
] as const;

export function ProductProof({ onOpenDemo, hasAccess }: { onOpenDemo: () => void; hasAccess: boolean }) {
  const [id, setId] = useState<(typeof SAMPLES)[number]["id"]>("RELIANCE");
  const sample = SAMPLES.find((s) => s.id === id) ?? SAMPLES[0];
  const min = Math.min(...sample.series);
  const max = Math.max(...sample.series);
  const pts = sample.series
    .map((v, i) => `${(i / (sample.series.length - 1)) * 100},${100 - ((v - min) / (max - min || 1)) * 90 - 5}`)
    .join(" ");

  return (
    <section id="proof" className="mx-auto max-w-6xl scroll-mt-20 px-5 pt-24 md:pt-32">
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Product proof</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
          Pick a stock. See the chart and a sourced brief.
        </h2>
      </div>
      <div className="rounded-3xl border border-white/70 bg-white/60 p-5 shadow-[var(--shadow-lg)] backdrop-blur-xl sm:p-8">
        <div role="tablist" aria-label="Sample securities" className="flex flex-wrap gap-2">
          {SAMPLES.map((s) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={s.id === id}
              onClick={() => setId(s.id)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                s.id === id ? "border-blue-600 bg-blue-600 text-white" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {s.id}
            </button>
          ))}
        </div>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-gray-900">{sample.name}</p>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="mt-3 h-48 w-full rounded-xl bg-blue-50/60" role="img" aria-label={`Illustrative price trend for ${sample.name}`}>
              <polyline points={pts} fill="none" stroke="#2563eb" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">AI brief</p>
            <ul className="mt-3 space-y-3">
              {sample.brief.map((b) => (
                <li key={b.text} className="text-sm leading-6 text-gray-700">
                  {b.text}
                  <span className="mt-0.5 block text-xs text-gray-500">Source: {b.cite}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-6 border-t border-gray-200/70 pt-4 text-xs leading-5 text-gray-500">
          Illustrative sample, not live data or a recommendation. The live terminal shows real prices with the source and time of each figure.{" "}
          {hasAccess ? (
            <Link href="/Home" className="font-medium text-blue-600 hover:underline">Open terminal →</Link>
          ) : (
            <button type="button" onClick={onOpenDemo} className="font-medium text-blue-600 hover:underline">Open the live demo →</button>
          )}
        </p>
      </div>
    </section>
  );
}
