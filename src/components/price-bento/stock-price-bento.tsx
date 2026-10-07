"use client";

import { useState } from "react";
import { PriceBento } from "@/components/price-bento/price-bento";
import { useBentoSeries } from "@/hooks/use-bento-series";
import { useMarketStatus } from "@/hooks/use-market-status";
import type { ResearchDetailPayload } from "@/lib/feeds/research-detail";
import { BENTO_TFS, derivePrevClose, usSessionOpen, type BentoTf, type BentoUnit } from "@/lib/price-bento/model";

const NO_INTRADAY: readonly BentoTf[] = BENTO_TFS.filter((t) => t !== "1D");

/**
 * Price Bento for a researched stock (India via Upstox, US via Yahoo/SEC waterfall).
 * Returns null when the instrument's currency has no supported unit — callers keep their legacy view then.
 */
export function StockPriceBento({ data }: { data: ResearchDetailPayload }) {
  const [tf, setTf] = useState<BentoTf>("1D");
  const { isOpen } = useMarketStatus();
  const q = data.upstoxQuote;
  const us = data.usDetail;
  // Indian names keep full intraday ranges even when the quote itself fell back to Yahoo
  // (the candles route has its own Upstox → Yahoo waterfall).
  const isIndia = data.market === "IN";

  const usCcy = us?.quote.currency;
  const unit: BentoUnit | null = isIndia ? "inr" : usCcy === "USD" ? "usd" : usCcy === "INR" ? "inr" : null;

  const tfs = isIndia ? BENTO_TFS : NO_INTRADAY;
  const activeTf: BentoTf = tfs.includes(tf) ? tf : tfs[0];
  const s = useBentoSeries({
    candleSymbol: isIndia ? data.symbol : null,
    dailyFallback: isIndia ? undefined : data.history,
    tf: activeTf,
  });

  if (!unit || (!q && !us)) return null;

  let close: number | null;
  let prevClose: number | null;
  let low: number | null;
  let high: number | null;
  let asOf: string | null;
  let session: "open" | "closed";
  let tz: "Asia/Kolkata" | "America/New_York";
  let source: string | null;
  let sourceUrl: string | undefined;

  if (q) {
    close = q.ltp;
    // Upstox `ohlc.close` is the running session close, NOT the previous close: prev = ltp − netChange.
    prevClose = derivePrevClose({ price: q.ltp, change: q.netChange });
    low = q.ohlc.low || null;
    high = q.ohlc.high || null;
    asOf = q.asOf;
    session = isOpen ? "open" : "closed";
    tz = "Asia/Kolkata";
    source = "Upstox";
    sourceUrl = `https://www.nseindia.com/get-quotes/equity?symbol=${encodeURIComponent(data.symbol)}`;
  } else if (us) {
    const uq = us.quote;
    close = uq.price;
    prevClose = derivePrevClose({ price: uq.price, prevClose: uq.prevClose, change: uq.change, changePct: uq.changePct });
    low = uq.dayLow ?? null;
    high = uq.dayHigh ?? null;
    asOf = uq.asOf;
    const asOfMs = Date.parse(uq.asOf);
    session = isIndia ? (isOpen ? "open" : "closed") : usSessionOpen(Number.isFinite(asOfMs) ? asOfMs : null) ? "open" : "closed";
    tz = isIndia ? "Asia/Kolkata" : "America/New_York";
    source = uq.provider === "yahoo" || !uq.provider ? "Yahoo Finance" : uq.provider;
    sourceUrl = undefined;
  } else {
    return null;
  }

  return (
    <PriceBento
      name={data.name || data.symbol}
      unit={unit}
      tz={tz}
      session={session}
      close={close}
      prevClose={prevClose}
      dayLow={low}
      dayHigh={high}
      asOf={asOf}
      tf={activeTf}
      onTfChange={setTf}
      tfs={tfs}
      series={s.series}
      seriesLoading={s.loading}
      seriesError={s.error}
      onRetrySeries={s.retry}
      source={source ?? s.source}
      sourceUrl={sourceUrl}
    />
  );
}
