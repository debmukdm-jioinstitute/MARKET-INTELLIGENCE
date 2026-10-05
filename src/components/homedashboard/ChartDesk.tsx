"use client";

import { useState } from "react";
import { IndicatorChart } from "@/components/trade-lab/indicator-chart";
import type { Timeframe } from "@/lib/trade-lab/types";
import { cn } from "@/lib/utils";
import { HomeLink, SectionHeading, cardClass } from "./shared";

const QUICK = ["NIFTY", "BANKNIFTY", "SENSEX", "RELIANCE", "HDFCBANK", "TCS", "INFY"];

/** Home-page chart: pick a script, tick any mix of indicators, see them plotted live. */
export function ChartDesk() {
  const [symbol, setSymbol] = useState("NIFTY");
  const [tf, setTf] = useState<Timeframe>("1d");
  const [draft, setDraft] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const s = draft.trim().toUpperCase().slice(0, 24);
    if (s) setSymbol(s);
    setDraft("");
  };

  return (
    <section aria-labelledby="chart-desk-title">
      <SectionHeading
        title="Chart desk"
        detail="Pick a script, add the indicators you trust, and watch them plot on the chart."
        action={<HomeLink href={`/intelligence/trade-lab?symbol=${encodeURIComponent(symbol)}&tf=${tf}`}>Open in Trade Lab</HomeLink>}
      />
      <div className={cardClass}>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {QUICK.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setSymbol(q)}
              className={cn("min-h-9 rounded-lg border px-3 text-sm font-semibold", symbol === q ? "border-teal-600 bg-teal-600 text-white" : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50")}
            >
              {q}
            </button>
          ))}
          <form onSubmit={submit} className="flex items-center gap-1.5">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Any NSE symbol"
              aria-label="Chart any NSE symbol"
              className="min-h-9 w-36 rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-900 placeholder:text-stone-400"
            />
            <button type="submit" className="min-h-9 rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-700 hover:bg-stone-50">Plot</button>
          </form>
          {!QUICK.includes(symbol) ? <span className="text-sm font-semibold text-stone-700">Showing {symbol}</span> : null}
        </div>
        <IndicatorChart symbol={symbol} tf={tf} onTfChange={setTf} height={400} />
      </div>
    </section>
  );
}
