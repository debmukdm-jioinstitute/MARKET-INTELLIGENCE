"use client";

import { useInstrumentSearch, type InstrumentSearchResult } from "@/hooks/use-instrument-search";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

export function TickerPicker({
  onPick,
  placeholder,
}: {
  onPick: (hit: InstrumentSearchResult) => void;
  placeholder?: string;
}) {
  const [market, setMarket] = useState<"IN" | "US">("IN");
  const [query, setQuery] = useState("");
  const { results, loading } = useInstrumentSearch(market, query);

  return (
    <div className="space-y-1.5">
      <Tabs
        value={market}
        onValueChange={(v) => {
          setMarket(v as "IN" | "US");
          setQuery("");
        }}
      >
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="IN">India</TabsTrigger>
          <TabsTrigger value="US">US</TabsTrigger>
        </TabsList>
      </Tabs>
      <Input
        placeholder={placeholder ?? (market === "IN" ? "Search NSE stock name or symbol…" : "Search US stock name or ticker…")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {loading ? <p className="text-xs text-muted-foreground">Searching…</p> : null}
      {results.length > 0 ? (
        <div className="max-h-48 overflow-y-auto rounded-md border border-border">
          {results.map((r) => (
            <button
              key={`${r.market}-${r.symbol}`}
              type="button"
              onClick={() => {
                onPick(r);
                setQuery("");
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
            >
              <span className="font-mono font-medium">{r.symbol}</span>
              <span className="truncate pl-2 text-xs text-muted-foreground">{r.name}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export type { InstrumentSearchResult };
