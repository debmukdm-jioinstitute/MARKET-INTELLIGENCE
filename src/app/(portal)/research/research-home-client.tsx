"use client";

import { SymbolSearch } from "@/components/research/symbol-search";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ResearchSearch() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  return <SymbolSearch initialQuery={q} autoFocus variant="hero" className="w-full" />;
}

export function ResearchHomeClient() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading search…</p>}>
      <ResearchSearch />
    </Suspense>
  );
}
