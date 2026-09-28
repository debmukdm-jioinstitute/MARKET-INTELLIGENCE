"use client";

import { resolveMarketState } from "@/lib/market-state";
import { dataIssueHref, formatAsOfIst } from "@/lib/provenance";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useEffect, useState } from "react";

const TONE: Record<string, string> = {
  live: "bg-emerald-500/10 text-emerald-700",
  delayed: "bg-amber-500/10 text-amber-700",
  closed: "bg-muted text-foreground",
  stale: "bg-rose-500/10 text-rose-700",
  unavailable: "bg-rose-500/10 text-rose-700",
  estimated: "bg-violet-500/10 text-violet-700",
};

/**
 * Quote header line: exchange · symbol · currency, then as-of time, freshness badge,
 * provider link, adjustment state, and a way to report the exact datum.
 */
export function QuoteProvenance({
  exchange,
  symbol,
  currency,
  asOf,
  delayMinutes,
  provider,
  url,
  adjustment,
  nseSession,
  estimatedMethod,
  unavailableReason,
  className,
}: {
  exchange: string;
  symbol: string;
  /** e.g. "INR", or "Index points". */
  currency: string;
  asOf?: string | null;
  /** 0 = real-time from the provider; N = stated delay in minutes; omit if unknown. */
  delayMinutes?: number;
  provider?: string;
  url?: string;
  /** e.g. "Corporate actions adjusted" or "Unadjusted". Omit when not applicable. */
  adjustment?: string;
  /** True for NSE-session instruments: outside 09:15–15:30 IST the state is "Closed". */
  nseSession?: boolean;
  /** Set when the value is modelled rather than observed; shown as an Estimated state. */
  estimatedMethod?: string;
  /** Set when no value can be shown; shown with a retry/report action. */
  unavailableReason?: string;
  className?: string;
}) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const fresh = now ? resolveMarketState({ asOf, delayMinutes, nseSession, estimatedMethod, unavailableReason, now }) : null;
  const stamp = formatAsOfIst(asOf);
  const datum = `${exchange}:${symbol}`;

  return (
    <div className={cn("space-y-1", className)}>
      <p className="text-xs text-muted-foreground">{exchange} · {symbol} · {currency}</p>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        {stamp ? <span>As of <time dateTime={asOf ?? undefined}>{stamp}</time></span> : <span>As of: not provided</span>}
        {fresh ? <span className={cn("rounded px-1.5 py-0.5 font-medium", TONE[fresh.kind])}>{fresh.label}</span> : null}
        {provider ? (
          <span>
            {url ? <a href={url} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">{provider} ↗</a> : provider}
          </span>
        ) : null}
        {adjustment ? <span>{adjustment}</span> : null}
        <Link href="/methodology" className="underline-offset-2 hover:underline">Methodology</Link>
        <a href={dataIssueHref(datum, { "As of": asOf, Provider: provider })} className="underline-offset-2 hover:underline">Report an issue</a>
      </p>
      {fresh?.detail ? (
        <p className={cn("text-xs", fresh.kind === "stale" || fresh.kind === "unavailable" ? "text-rose-700" : "text-muted-foreground")} title={estimatedMethod}>
          {fresh.detail}
          {fresh.kind === "unavailable" ? (
            <> · <button type="button" onClick={() => window.location.reload()} className="underline underline-offset-2">Retry</button></>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
