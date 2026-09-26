"use client";

import type { AddHoldingInput } from "@/hooks/use-my-portfolio";
import { useInstrumentSearch, type InstrumentSearchResult } from "@/hooks/use-instrument-search";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import { useState } from "react";

export function AddHoldingDialog({ onAdd }: { onAdd: (input: AddHoldingInput) => Promise<unknown> }) {
  const [open, setOpen] = useState(false);
  const [market, setMarket] = useState<"IN" | "US">("IN");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<InstrumentSearchResult | null>(null);
  const [shares, setShares] = useState("");
  const [avgCost, setAvgCost] = useState("");
  const [addedAt, setAddedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { results, loading } = useInstrumentSearch(market, selected ? "" : query);

  function reset() {
    setQuery("");
    setSelected(null);
    setShares("");
    setAvgCost("");
    setError(null);
  }

  async function submit() {
    if (!selected) return;
    const sharesN = Number(shares);
    const avgCostN = Number(avgCost);
    if (!sharesN || sharesN <= 0 || !avgCostN || avgCostN <= 0) {
      setError("Enter valid shares and average cost.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onAdd({
        market: selected.market,
        symbol: selected.symbol,
        instrumentKey: selected.instrumentKey,
        name: selected.name,
        sector: selected.sector,
        currency: selected.currency,
        shares: sharesN,
        avgCost: avgCostN,
        addedAt,
      });
      setOpen(false);
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add holding");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="default" size="lg" className="font-semibold">
          <Plus data-icon="inline-start" />
          Add Position
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a holding</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <Tabs
            value={market}
            onValueChange={(v) => {
              setMarket(v as "IN" | "US");
              setSelected(null);
              setQuery("");
            }}
          >
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="IN">India</TabsTrigger>
              <TabsTrigger value="US">US</TabsTrigger>
            </TabsList>
          </Tabs>

          {!selected ? (
            <div className="space-y-1">
              <Input
                placeholder={market === "IN" ? "Search NSE stock name or symbol…" : "Search US stock name or ticker…"}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {loading ? <p className="text-sm text-muted-foreground">Searching…</p> : null}
              {results.length > 0 ? (
                <div className="max-h-52 overflow-y-auto rounded-md border border-border">
                  {results.map((r) => (
                    <button
                      key={`${r.market}-${r.symbol}`}
                      type="button"
                      onClick={() => setSelected(r)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
                    >
                      <span className="font-medium">{r.symbol}</span>
                      <span className="truncate pl-2 text-sm text-muted-foreground">{r.name}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{selected.symbol}</p>
                  <p className="text-sm text-muted-foreground">{selected.name}</p>
                </div>
                <button type="button" onClick={() => setSelected(null)} className="text-sm text-muted-foreground underline">
                  Change
                </button>
              </div>
              <Input
                type="number"
                placeholder="Shares"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
              />
              <Input
                type="number"
                placeholder={`Average cost (${selected.currency})`}
                value={avgCost}
                onChange={(e) => setAvgCost(e.target.value)}
              />
              <Input type="date" value={addedAt} onChange={(e) => setAddedAt(e.target.value)} />
              {error ? <p className="text-sm text-rose-600">{error}</p> : null}
              <Button onClick={submit} disabled={submitting} className="w-full bg-blue-600 text-white hover:bg-blue-600 font-bold">
                {submitting ? "Adding to portfolio…" : "Confirm & Add to Portfolio"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
