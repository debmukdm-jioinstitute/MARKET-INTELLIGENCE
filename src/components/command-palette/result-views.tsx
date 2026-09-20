"use client";

import { useFeedHub } from "@/hooks/use-feed-hub";
import { useFundamentals } from "@/hooks/use-fundamentals";
import { useOptionChain, useOptionExpiries } from "@/hooks/use-option-chain";
import { useUpstoxQuote } from "@/hooks/use-upstox-quote";
import type { IndiaInstrument } from "@/lib/feeds/india/instruments";
import type { Instrument } from "@/lib/types";
import { fmtChgPct, fmtInr } from "@/lib/format-india";
import { formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import Link from "next/link";

function ChangeTag({ value }: { value: number }) {
  return (
    <span className={cn("font-mono", value >= 0 ? "text-emerald-400" : "text-rose-400")}>
      {value >= 0 ? "+" : ""}
      {fmtChgPct(value)}
    </span>
  );
}

/** Compact India quote card — full quote via Upstox. */
export function IndiaQuoteResultView({ instrument }: { instrument: IndiaInstrument }) {
  const { data: quote, loading, error } = useUpstoxQuote(instrument.symbol, true);
  return (
    <div className="space-y-3 p-4 font-mono text-sm">
      <div>
        <p className="text-base font-semibold">{instrument.name}</p>
        <p className="text-xs text-muted-foreground">
          {instrument.symbol} · {instrument.sector} · Upstox
        </p>
      </div>
      {loading && !quote ? <p className="text-xs text-muted-foreground">Loading…</p> : null}
      {error ? <p className="text-xs text-rose-400">{error}</p> : null}
      {quote ? (
        <div className="flex items-baseline gap-3">
          <span className="text-2xl tabular-nums">{fmtInr(quote.ltp)}</span>
          <ChangeTag value={quote.ohlc.close ? (quote.ltp - quote.ohlc.close) / quote.ohlc.close : 0} />
        </div>
      ) : null}
      <Link href="/markets/india" className="inline-block text-xs text-primary hover:underline">
        Open full quote, depth & candles →
      </Link>
    </div>
  );
}

/** Compact fundamentals snippet — top ratios only, full table lives on /markets/india. */
export function IndiaFundamentalsResultView({ instrument }: { instrument: IndiaInstrument }) {
  const { data, loading, error } = useFundamentals(instrument.isin, true);
  return (
    <div className="space-y-3 p-4 font-mono text-sm">
      <p className="text-base font-semibold">{instrument.name} — key ratios</p>
      {loading && !data ? <p className="text-xs text-muted-foreground">Loading…</p> : null}
      {error ? <p className="text-xs text-rose-400">{error}</p> : null}
      {data ? (
        <dl className="grid grid-cols-2 gap-1 text-xs">
          {data.ratios.slice(0, 6).map((r) => (
            <div key={r.name} className="flex justify-between gap-2">
              <dt className="text-muted-foreground">{r.name}</dt>
              <dd>{r.companyValue != null ? `${r.companyValue}${r.unitSuffix}` : "—"}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <Link href="/markets/india" className="inline-block text-xs text-primary hover:underline">
        Open full fundamentals & sector radar →
      </Link>
    </div>
  );
}

/** Compact option-chain summary — nearest expiry, top-level stats only. */
export function OptionChainResultView({ underlyingKey, label }: { underlyingKey: string; label: string }) {
  const { expiry, loading: expiriesLoading } = useOptionExpiries(underlyingKey);
  const { data, loading, error } = useOptionChain(underlyingKey, expiry);
  return (
    <div className="space-y-3 p-4 font-mono text-sm">
      <p className="text-base font-semibold">{label} option chain</p>
      {(expiriesLoading || loading) && !data ? (
        <p className="text-xs text-muted-foreground">Loading chain…</p>
      ) : null}
      {error ? <p className="text-xs text-rose-400">{error}</p> : null}
      {data ? (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Stat k="Expiry" v={data.expiry} />
          <Stat k="Spot" v={fmtInr(data.underlyingSpot)} />
          <Stat k="PCR" v={data.pcr != null ? data.pcr.toFixed(3) : "—"} />
          <Stat k="Max pain" v={data.maxPain != null ? data.maxPain.toLocaleString("en-IN") : "—"} />
        </div>
      ) : null}
      <Link href="/markets/derivatives" className="inline-block text-xs text-primary hover:underline">
        Open full chain with Greeks & IV smile →
      </Link>
    </div>
  );
}

/** Compact global (US/other) quote card — from the already-cached feed hub. */
export function GlobalQuoteResultView({ instrument }: { instrument: Instrument }) {
  const { data, loading } = useFeedHub(45_000);
  const q = data?.quotes.find((r) => r.symbol === instrument.symbol);
  return (
    <div className="space-y-3 p-4 font-mono text-sm">
      <div>
        <p className="text-base font-semibold">{instrument.name}</p>
        <p className="text-xs text-muted-foreground">
          {instrument.symbol} · {instrument.sector} · {q?.provider ?? "—"}
        </p>
      </div>
      {loading && !data ? <p className="text-xs text-muted-foreground">Loading…</p> : null}
      {q ? (
        <div className="flex items-baseline gap-3">
          <span className="text-2xl tabular-nums">${q.price.toFixed(2)}</span>
          <span className={cn("font-mono", q.changePct >= 0 ? "text-emerald-400" : "text-rose-400")}>
            {formatPct(q.changePct)}
          </span>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No live quote — simulated tape only.</p>
      )}
      <Link href="/markets" className="inline-block text-xs text-primary hover:underline">
        Open investable universe →
      </Link>
    </div>
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
