"use client";

import type { AddHoldingInput } from "@/hooks/use-my-portfolio";
import { useInstrumentCmp } from "@/hooks/use-instrument-cmp";
import { useInstrumentSearch, type InstrumentSearchResult } from "@/hooks/use-instrument-search";
import { formatPct } from "@/lib/format";
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

export function AddHoldingDialog({
  onAdd,
  triggerLabel = "Add holding",
}: {
  onAdd: (input: AddHoldingInput) => Promise<unknown>;
  triggerLabel?: string;
}) {
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
  const cmp = useInstrumentCmp(selected?.market ?? null, selected?.symbol ?? null, Boolean(selected));

  function formatCmpPrice(price: number, currency: "INR" | "USD") {
    if (currency === "INR") {
      return `₹${price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

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
          {triggerLabel}
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
              <div className="rounded-md border border-border px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{selected.symbol}</p>
                    <p className="text-sm text-muted-foreground">{selected.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="shrink-0 text-sm text-muted-foreground underline"
                  >
                    Change
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 border-t border-border pt-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">CMP</span>
                  {cmp.loading ? (
                    <span className="text-sm text-muted-foreground">Loading…</span>
                  ) : cmp.price != null ? (
                    <>
                      <span className="text-sm font-semibold tabular-nums">
                        {formatCmpPrice(cmp.price, selected.currency)}
                      </span>
                      {cmp.changePct != null ? (
                        <span
                          className={
                            cmp.changePct >= 0
                              ? "text-sm tabular-nums text-emerald-600"
                              : "text-sm tabular-nums text-rose-600"
                          }
                        >
                          {formatPct(cmp.changePct)}
                        </span>
                      ) : null}
                      {!avgCost && cmp.price != null ? (
                        <button
                          type="button"
                          className="text-sm font-semibold text-blue-600 hover:underline"
                          onClick={() => setAvgCost(String(cmp.price))}
                        >
                          Use as avg cost
                        </button>
                      ) : null}
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {cmp.error ? "Quote unavailable" : "—"}
                    </span>
                  )}
                </div>
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
