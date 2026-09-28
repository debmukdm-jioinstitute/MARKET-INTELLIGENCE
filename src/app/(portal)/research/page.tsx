"use client";

import { SymbolSearch } from "@/components/research/symbol-search";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const EXAMPLE_CHIPS = ["RELIANCE", "HDFCBANK", "TCS"] as const;

function ResearchHome() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";

  return (
    <div className="mx-auto w-full max-w-3xl px-2 py-8 md:py-12">
      <div className="mb-8 text-center">
        <p className="text-sm uppercase tracking-[0.28em] text-[#1a73e8]">Investment research</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Find any stock</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          India (NSE) and US tickers — quote, charts, news, and fundamentals when our market feeds are connected.
        </p>
      </div>

      <SymbolSearch initialQuery={q} autoFocus variant="hero" className="w-full" />

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <span className="text-xs text-muted-foreground">Try:</span>
        {EXAMPLE_CHIPS.map((sym) => (
          <Link
            key={sym}
            href={`/research/${sym}`}
            className="rounded-full border border-border bg-card px-3 py-1 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-accent"
          >
            {sym}
          </Link>
        ))}
      </div>

      <ul className="mx-auto mt-8 max-w-lg list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
        <li>Live quote and price history (India via Upstox when configured; US via public feeds)</li>
        <li>Headlines with rule-based sentiment tags — not buy/sell calls</li>
        <li>Link through to the integrated valuation model when you want a DCF</li>
      </ul>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Pick from the dropdown or press Enter. Press <span className="text-[#1a73e8]">Space</span> anywhere to focus search.
      </p>
    </div>
  );
}

export default function ResearchPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
      <ResearchHome />
    </Suspense>
  );
}
