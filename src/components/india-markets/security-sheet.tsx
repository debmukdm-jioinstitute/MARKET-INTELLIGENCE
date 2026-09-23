"use client";

import { CandlestickChart } from "@/components/charts/candlestick-chart";
import { MarketDepthLadder } from "@/components/feeds/market-depth-ladder";
import { DataInfo } from "@/components/feeds/data-info";
import { KeyRatiosPanel } from "@/components/fundamentals/key-ratios-panel";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCandles } from "@/hooks/use-candles";
import { useFundamentals } from "@/hooks/use-fundamentals";
import { useUpstoxQuote } from "@/hooks/use-upstox-quote";
import type { IndiaInstrument } from "@/lib/feeds/india/instruments";
import type { CandleRange } from "@/lib/feeds/sources/upstox";
import { fmtChgPct, fmtInr } from "@/lib/format-india";
import { cn } from "@/lib/utils";
import { useState } from "react";

const UPSTOX_QUOTE_SOURCE = {
  provider: "Upstox",
  url: "https://upstox.com/developer/api-documentation/get-full-market-quote/",
};

const RANGE_LABEL: Record<CandleRange, string> = {
  "1M": "1 month",
  "3M": "3 months",
  "6M": "6 months",
  "1Y": "1 year",
};

export function SecuritySheet({
  instrument,
  open,
  onOpenChange,
}: {
  instrument: IndiaInstrument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: quote, loading, error } = useUpstoxQuote(instrument?.symbol ?? null, open);
  const [range, setRange] = useState<CandleRange>("3M");
  const { candles, loading: candlesLoading } = useCandles(instrument?.symbol ?? null, range, open);
  const { data: fundamentals, loading: fundamentalsLoading } = useFundamentals(
    instrument?.isin ?? null,
    open,
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="">{instrument?.symbol}</SheetTitle>
          <SheetDescription>
            {instrument?.name} · {instrument?.sector}
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-5 px-4 pb-6">
          {loading && !quote ? (
            <p className="text-sm text-muted-foreground">Loading quote…</p>
          ) : null}
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          {quote ? (
            <>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-2xl tabular-nums">{fmtInr(quote.ltp)}</p>
                  <p
                    className={cn(
                      "text-sm",
                      quote.netChange >= 0 ? "text-emerald-600" : "text-rose-600",
                    )}
                  >
                    {quote.netChange >= 0 ? "+" : ""}
                    {fmtInr(quote.netChange)} ({fmtChgPct(quote.ohlc.close ? quote.netChange / quote.ohlc.close : 0)})
                  </p>
                </div>
                <DataInfo source={{ ...UPSTOX_QUOTE_SOURCE, asOf: quote.asOf }} />
              </div>

              <dl className="grid grid-cols-2 gap-2 text-sm">
                <Stat k="Open" v={fmtInr(quote.ohlc.open)} />
                <Stat k="Prev close" v={fmtInr(quote.ohlc.close)} />
                <Stat k="High" v={fmtInr(quote.ohlc.high)} />
                <Stat k="Low" v={fmtInr(quote.ohlc.low)} />
                <Stat k="Volume" v={quote.volume.toLocaleString("en-IN")} />
                <Stat k="Avg price" v={fmtInr(quote.avgPrice)} />
                <Stat k="Upper circuit" v={fmtInr(quote.upperCircuit)} />
                <Stat k="Lower circuit" v={fmtInr(quote.lowerCircuit)} />
                {quote.oi != null ? <Stat k="OI" v={quote.oi.toLocaleString("en-IN")} /> : null}
                <Stat k="Total buy qty" v={quote.totalBuyQuantity.toLocaleString("en-IN")} />
                <Stat k="Total sell qty" v={quote.totalSellQuantity.toLocaleString("en-IN")} />
              </dl>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                  Market depth (5 level)
                </p>
                <MarketDepthLadder buy={quote.depth.buy} sell={quote.depth.sell} />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Price history
                  </p>
                  <Select value={range} onValueChange={(v) => setRange(v as CandleRange)}>
                    <SelectTrigger className="h-7 w-[120px] text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(RANGE_LABEL) as CandleRange[]).map((r) => (
                        <SelectItem key={r} value={r}>
                          {RANGE_LABEL[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {candlesLoading && !candles.length ? (
                  <p className="text-sm text-muted-foreground">Loading candles…</p>
                ) : candles.length ? (
                  <CandlestickChart candles={candles} />
                ) : (
                  <p className="text-sm text-muted-foreground">No candle data.</p>
                )}
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                  Fundamentals — key ratios
                </p>
                {fundamentalsLoading && !fundamentals ? (
                  <p className="text-sm text-muted-foreground">Loading fundamentals…</p>
                ) : fundamentals ? (
                  <KeyRatiosPanel snapshot={fundamentals} />
                ) : (
                  <p className="text-sm text-muted-foreground">No fundamentals data.</p>
                )}
              </div>
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
