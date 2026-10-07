"use client";
import useSWR from "swr";
import { Activity, ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { DataInfo } from "@/components/feeds/data-info";
import { useCandles } from "@/hooks/use-candles";
import type {
  BreadthSnapshot,
  IndiaDashboardPayload,
  QuoteField,
} from "@/lib/feeds/india/types";
import {
  breadthInsight,
  marketStatus,
  vixInsight,
} from "@/lib/homedashboard/insights";
import {
  cardClass,
  fetchOptions,
  homeJson,
  HomeLink,
  SectionHeading,
} from "./shared";

function IndexCard({
  name,
  quote,
  meaning,
  hubSyncedAt,
}: {
  name: string;
  quote?: QuoteField;
  meaning: string;
  hubSyncedAt?: string;
}) {
  const { candles } = useCandles(name, "1D", true);
  const lastDay = candles.length
    ? candles[candles.length - 1].ts.slice(0, 10)
    : null;
  const values = candles
    .filter((c) => c.ts.slice(0, 10) === lastDay && Number.isFinite(c.close))
    .map((c) => c.close);
  const low = Math.min(...values),
    high = Math.max(...values);
  const points = values
    .map(
      (v, i) =>
        `${(i / Math.max(1, values.length - 1)) * 180},${36 - ((v - low) / (high - low || 1)) * 30}`,
    )
    .join(" ");

  const change =
    quote?.changePct ??
    (quote?.change != null && quote?.value != null && quote.value !== quote.change
      ? quote.change / (quote.value - quote.change)
      : null);
  const pct = change != null ? change * 100 : null;
  const isPositive = pct != null && pct >= 0.005;
  const isNegative = pct != null && pct <= -0.005;
  const formattedPct =
    pct != null ? (Math.abs(pct) < 0.005 ? "0.00" : pct.toFixed(2)) : null;
  const ChangeIcon =
    !pct || (!isPositive && !isNegative)
      ? Minus
      : isPositive
        ? ArrowUpRight
        : ArrowDownRight;

  const strokeClass =
    isPositive
      ? "text-teal-600"
      : isNegative
        ? "text-rose-600"
        : values.length > 1 && values[values.length - 1] >= values[0]
          ? "text-teal-600"
          : "text-rose-600";

  return (
    <article className="min-w-0 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-1.5">
        <h3 className="text-xs font-semibold tracking-wide text-stone-500">
          {name}
        </h3>
        {quote?.source ? (
          <DataInfo
            source={quote.source}
            name={name}
            hubSyncedAt={hubSyncedAt}
          />
        ) : null}
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-stone-900 tabular-nums">
        {quote?.value != null
          ? quote.value.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : "—"}
      </p>
      <p
        className={`mt-1 flex items-center gap-1 text-xs font-semibold ${
          !pct || (!isPositive && !isNegative)
            ? "text-stone-500"
            : isPositive
              ? "text-emerald-600"
              : "text-rose-600"
        }`}
      >
        <ChangeIcon className="size-3.5" />
        {formattedPct == null
          ? "Quote unavailable"
          : `${isPositive ? "+" : ""}${formattedPct}% · day change`}
      </p>
      {values.length > 1 ? (
        <svg
          role="img"
          aria-label={`${name} intraday close, ${lastDay}`}
          viewBox="0 0 180 42"
          className={`mt-3 h-10 w-full ${strokeClass}`}
        >
          <path d="M0 40H180 M0 20H180" stroke="#e7e5e4" strokeWidth="0.5" />
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            points={points}
          />
        </svg>
      ) : (
        <p className="mt-3 flex h-10 items-center text-xs text-stone-500">
          Intraday chart unavailable
        </p>
      )}
      <p className="mt-2 text-xs leading-relaxed text-stone-500">{meaning}</p>
      {quote?.source.asOf ? (
        <p className="mt-2 break-words text-[10px] text-stone-500">
          Quote as of {quote.source.asOf}
        </p>
      ) : null}
    </article>
  );
}

export function MarketPulse({
  data,
  now,
}: {
  data: IndiaDashboardPayload | null;
  now: Date | null;
}) {
  const { data: liveBreadth } = useSWR<BreadthSnapshot>(
    "/api/feeds/upstox/breadth",
    homeJson,
    fetchOptions,
  );
  const breadth =
    liveBreadth?.advances != null ? liveBreadth : data?.pulse.breadth;
  const adv = breadth?.advances,
    dec = breadth?.declines;
  const total = (adv ?? 0) + (dec ?? 0);
  const status = now
    ? marketStatus(now)
    : { state: "closed", label: "Market hours · IST" };
  return (
    <section aria-label="Market Pulse">
      <SectionHeading
        title="Market Pulse"
        detail="A quick read on India. A little context behind every move."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <HomeLink href="/markets/india">India depth</HomeLink>
            <HomeLink href="/markets">Full market board</HomeLink>
          </div>
        }
      />
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-stone-500">
        <span className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1.5 font-medium text-stone-900">
          <span
            className={`size-1.5 rounded-full ${status.state === "live" ? "motion-safe:animate-pulse bg-emerald-600" : status.state === "pre-open" ? "bg-amber-600" : "bg-stone-400"}`}
          />
          {status.label}
        </span>
        <span>Regular NSE hours · holidays may differ</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <IndexCard
          name="NIFTY 50"
          quote={data?.pulse.nifty}
          meaning="India’s 50 large companies — your broad market reference."
          hubSyncedAt={data?.fetchedAt}
        />
        <IndexCard
          name="SENSEX"
          quote={data?.pulse.sensex}
          meaning="30 major BSE companies — another view of large-cap direction."
          hubSyncedAt={data?.fetchedAt}
        />
        <IndexCard
          name="BANK NIFTY"
          quote={data?.pulse.bankNifty}
          meaning="Banking stocks — a read on the financial sector."
          hubSyncedAt={data?.fetchedAt}
        />
        <IndexCard
          name="INDIA VIX"
          quote={data?.pulse.indiaVix}
          meaning={vixInsight(data?.pulse.indiaVix.value)}
          hubSyncedAt={data?.fetchedAt}
        />
      </div>
      <div className={`${cardClass} mt-3`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-900">
              <Activity className="size-4 text-teal-600" />
              Is the whole market joining in?
            </h3>
            {breadth?.source ? (
              <DataInfo
                source={breadth.source}
                name="Market Breadth"
                hubSyncedAt={data?.fetchedAt}
              />
            ) : null}
          </div>
          <p className="text-xs text-stone-500">
            {adv != null && dec != null
              ? `${adv.toLocaleString("en-IN")} advancing · ${dec.toLocaleString("en-IN")} declining`
              : "Advances / declines unavailable"}
          </p>
        </div>
        {total > 0 ? (
          <div
            role="img"
            aria-label={`${adv} advances and ${dec} declines`}
            className="mt-3 flex h-2 overflow-hidden rounded-full bg-stone-100"
          >
            <div
              className="bg-emerald-600"
              style={{ width: `${((adv ?? 0) / total) * 100}%` }}
            />
            <div className="flex-1 bg-rose-600" />
          </div>
        ) : null}
        <p className="mt-3 text-sm text-stone-500">
          {breadthInsight(adv, dec)}
        </p>
      </div>
    </section>
  );
}
