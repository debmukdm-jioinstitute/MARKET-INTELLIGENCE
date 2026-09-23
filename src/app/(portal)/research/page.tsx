"use client";

import { SymbolSearch } from "@/components/research/symbol-search";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ResearchHome() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center px-2 py-10">
      <div className="mb-10 w-full max-w-5xl text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#1a73e8]">
          Investment research
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Find any stock</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">
          India (NSE) and US tickers — live quote, depth, news, and fundamentals from Upstox when
          configured.
        </p>
      </div>
      <SymbolSearch initialQuery={q} autoFocus variant="hero" className="w-full px-2" />
      <p className="mt-6 max-w-xl text-center text-xs text-muted-foreground">
        Pick from the dropdown or press Enter. Press <span className="text-[#1a73e8]">Space</span>{" "}
        anywhere to focus search.
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
