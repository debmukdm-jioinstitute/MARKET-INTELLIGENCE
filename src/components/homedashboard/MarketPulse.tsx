"use client";

import useSWR from "swr";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Clock,
  Eye,
  PieChart,
} from "lucide-react";
import { DataInfo } from "@/components/feeds/data-info";
import { useCandles } from "@/hooks/use-candles";
import type {
  BreadthSnapshot,
  IndiaDashboardPayload,
  QuoteField,
} from "@/lib/feeds/india/types";
import { computeChartMove } from "@/lib/chart-direction";
import { fmtMove } from "@/lib/format-india";
import { formatPct } from "@/lib/format";
import {
  breadthInsight,
  marketStatus,
} from "@/lib/homedashboard/insights";
import type { CandleRange } from "@/lib/feeds/sources/upstox";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { fetchOptions, homeJson, HomeLink } from "./shared";

const PULSE_TFS = ["1D", "1W", "1M", "1Y", "5Y"] as const;
type PulseTf = (typeof PULSE_TFS)[number];

type PulseCardConfig = {
  label: string;
  candleSymbol: string;
  exchange: "NSE" | "BSE";
  overviewHref: string;
  quote?: QuoteField;
};

function deriveChangeFraction(quote?: QuoteField): number | null {
  if (quote?.changePct != null) return quote.changePct;
  if (
    quote?.change != null &&
    quote.value != null &&
    quote.value !== quote.change
  ) {
    return quote.change / (quote.value - quote.change);
  }
  return null;
}

function formatAsOfIst(iso?: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return null;
  }
}

function seriesFromCandles(
  candles: { ts: string; close: number }[],
  tf: PulseTf,
): number[] {
  if (!candles.length) return [];
  if (tf !== "1D") {
    return candles.filter((c) => Number.isFinite(c.close)).map((c) => c.close);
  }
  const lastDay = candles[candles.length - 1].ts.slice(0, 10);
  return candles
    .filter((c) => c.ts.slice(0, 10) === lastDay && Number.isFinite(c.close))
    .map((c) => c.close);
}

function sparklinePoints(values: number[], width = 200, height = 48): string {
  if (values.length < 2) return "";
  const low = Math.min(...values);
  const high = Math.max(...values);
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - 4 - ((v - low) / (high - low || 1)) * (height - 8);
      return `${x},${y}`;
    })
    .join(" ");
}

function ExchangeMark({ exchange }: { exchange: "NSE" | "BSE" }) {
  const isNse = exchange === "NSE";
  return (
    <div className="flex h-8 items-center" title={exchange}>
      {isNse ? (
        <Image
          src="/images/exchanges/nse.png"
          alt="NSE"
          width={88}
          height={30}
          className="h-5 w-auto object-contain"
          priority
        />
      ) : (
        <Image
          src="/images/exchanges/bse.png"
          alt="BSE"
          width={48}
          height={30}
          className="h-7 w-auto object-contain"
          priority
        />
      )}
    </div>
  );
}

function PulseIndexCard({
  config,
  hubSyncedAt,
}: {
  config: PulseCardConfig;
  hubSyncedAt?: string;
}) {
  const [tf, setTf] = useState<PulseTf>("1D");
  const { candles } = useCandles(config.candleSymbol, tf as CandleRange, true);
  const quote = config.quote;
  const changeFrac = deriveChangeFraction(quote);
  const dailyDown = changeFrac != null && changeFrac < 0;
  const dailyUp = changeFrac != null && changeFrac > 0;

  const values = useMemo(() => seriesFromCandles(candles, tf), [candles, tf]);
  const rangeMove = useMemo(() => {
    if (!values.length) return null;
    const dayQuote =
      tf === "1D" && quote?.value != null && quote.change != null
        ? { price: quote.value, change: quote.change }
        : undefined;
    return computeChartMove(values, {
      isIntraday: tf === "1D",
      quote: dayQuote,
    });
  }, [values, tf, quote]);

  const chartUp = rangeMove?.isUp ?? dailyUp;
  const chartDown = rangeMove != null ? !rangeMove.isUp && rangeMove.change !== 0 : dailyDown;

  const stroke = chartDown ? "#A52F38" : chartUp ? "#26713D" : "#62656B";
  const tint = chartDown
    ? "from-[#FEE8E8]/80 to-white"
    : chartUp
      ? "from-[#E4F5EA]/80 to-white"
      : "from-stone-50 to-white";

  const points = sparklinePoints(values);
  const badgePct = rangeMove?.changePct ?? changeFrac;

  return (
    <article
      className={cn(
        "flex min-w-0 flex-col rounded-2xl border border-stone-200 bg-gradient-to-b p-4 shadow-sm",
        tint,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <ExchangeMark exchange={config.exchange} />
        <Link
          href={config.overviewHref}
          className="inline-flex size-8 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 transition-colors hover:border-stone-400 hover:text-stone-900"
          aria-label={`Open overview for ${config.label}`}
          title="Open overview"
        >
          <Eye className="size-4 stroke-[2]" aria-hidden />
        </Link>
      </div>

      <div className="mt-3 flex items-center gap-1">
        <h3 className="text-sm font-bold tracking-tight text-stone-900">{config.label}</h3>
        {quote?.source ? (
          <DataInfo
            source={quote.source}
            name={config.label}
            hubSyncedAt={hubSyncedAt}
            className="shrink-0"
          />
        ) : null}
      </div>

      <p className="mt-2 text-[28px] font-bold tabular-nums leading-none tracking-tight text-stone-900 sm:text-[30px]">
        {quote?.value != null
          ? quote.value.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : "—"}
      </p>

      <p
        className={cn(
          "mt-1.5 flex items-center gap-1 text-sm font-semibold tabular-nums",
          dailyDown ? "text-[#A52F38]" : dailyUp ? "text-[#26713D]" : "text-stone-500",
        )}
      >
        {dailyDown ? (
          <ArrowDown className="size-3.5 stroke-[3]" aria-hidden />
        ) : dailyUp ? (
          <ArrowUp className="size-3.5 stroke-[3]" aria-hidden />
        ) : null}
        <span>{fmtMove(quote?.change ?? null, changeFrac)}</span>
      </p>

      <div className="relative mt-3 min-h-[52px]">
        {points ? (
          <svg
            role="img"
            aria-label={`${config.label} ${tf} trend`}
            viewBox="0 0 200 48"
            className="h-[52px] w-full"
            preserveAspectRatio="none"
          >
            <polyline
              fill="none"
              stroke={stroke}
              strokeWidth="2.25"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={points}
            />
          </svg>
        ) : (
          <p className="flex h-[52px] items-center text-xs text-stone-500">Chart loading…</p>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div
          role="tablist"
          aria-label={`${config.label} chart range`}
          className="inline-flex rounded-full border border-stone-200 bg-white/80 p-0.5 text-[11px] font-semibold"
        >
          {PULSE_TFS.map((r) => {
            const on = r === tf;
            return (
              <button
                key={r}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setTf(r)}
                className={cn(
                  "rounded-full px-2 py-0.5 transition-colors",
                  on ? "bg-stone-900 text-white" : "text-stone-600 hover:text-stone-900",
                )}
              >
                {r}
              </button>
            );
          })}
        </div>
        {badgePct != null ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums",
              badgePct < 0 ? "bg-[#FEE8E8] text-[#A52F38]" : badgePct > 0 ? "bg-[#E4F5EA] text-[#26713D]" : "bg-stone-100 text-stone-600",
            )}
          >
            {badgePct < 0 ? (
              <ArrowDown className="size-3 stroke-[3]" aria-hidden />
            ) : badgePct > 0 ? (
              <ArrowUp className="size-3 stroke-[3]" aria-hidden />
            ) : null}
            {formatPct(badgePct)}
          </span>
        ) : null}
      </div>

      <p className="mt-3 text-[10px] text-stone-500">
        {formatAsOfIst(quote?.source.asOf)
          ? `As of ${formatAsOfIst(quote?.source.asOf)} IST`
          : "Quote time unavailable"}
      </p>
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
  const adv = breadth?.advances;
  const dec = breadth?.declines;
  const total = (adv ?? 0) + (dec ?? 0);
  const advPct = total > 0 && adv != null ? (adv / total) * 100 : null;
  const decPct = total > 0 && dec != null ? (dec / total) * 100 : null;
  const status = now
    ? marketStatus(now)
    : { state: "closed", label: "Market hours · IST" };

  const cards: PulseCardConfig[] = useMemo(
    () => [
      {
        label: "NIFTY 50",
        candleSymbol: "NIFTY 50",
        exchange: "NSE",
        overviewHref: "/markets/india/nifty-50",
        quote: data?.pulse.nifty,
      },
      {
        label: "SENSEX",
        candleSymbol: "SENSEX",
        exchange: "BSE",
        overviewHref: "/markets/india/sensex",
        quote: data?.pulse.sensex,
      },
      {
        label: "BANK NIFTY",
        candleSymbol: "BANK NIFTY",
        exchange: "NSE",
        overviewHref: "/markets/india/nifty-bank",
        quote: data?.pulse.bankNifty,
      },
      {
        label: "INDIA VIX",
        candleSymbol: "INDIA VIX",
        exchange: "NSE",
        overviewHref: "/markets/india/india-vix",
        quote: data?.pulse.indiaVix,
      },
    ],
    [data?.pulse],
  );

  return (
    <section
      aria-label="Market Pulse"
      className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="size-5 text-sky-600" aria-hidden />
            <h2 className="text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">
              Market Pulse
            </h2>
          </div>
          <p className="mt-1 text-sm text-stone-500">
            A quick read on India. A little context behind every move.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            prefetch={false}
            href="/markets/india"
            className="inline-flex min-h-9 items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-3.5 py-1.5 text-sm font-semibold text-sky-900 transition-colors hover:bg-sky-100"
          >
            India depth
            <span aria-hidden>↗</span>
          </Link>
          <HomeLink href="/markets">Full market board</HomeLink>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-stone-500">
        <span className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 font-medium text-stone-900">
          <Clock className="size-3.5 text-stone-500" aria-hidden />
          <span
            className={cn(
              "size-1.5 rounded-full",
              status.state === "live"
                ? "motion-safe:animate-pulse bg-emerald-600"
                : status.state === "pre-open"
                  ? "bg-amber-600"
                  : "bg-stone-400",
            )}
          />
          {status.label}
        </span>
        <span>Regular NSE hours · holidays may differ</span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <PulseIndexCard key={c.label} config={c} hubSyncedAt={data?.fetchedAt} />
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50/50 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <PieChart className="mt-0.5 size-4 text-sky-600" aria-hidden />
            <div>
              <h3 className="flex items-center gap-1.5 text-sm font-bold text-stone-900">
                Is the whole market joining in?
                {breadth?.source ? (
                  <DataInfo
                    source={breadth.source}
                    name="Market Breadth"
                    hubSyncedAt={data?.fetchedAt}
                  />
                ) : null}
              </h3>
              <p className="mt-1 text-sm text-stone-600">{breadthInsight(adv, dec)}</p>
            </div>
          </div>
          <div className="space-y-1 text-right text-xs font-semibold tabular-nums">
            {adv != null && advPct != null ? (
              <p className="text-[#26713D]">
                <span className="mr-1 inline-block size-1.5 rounded-full bg-[#26713D]" aria-hidden />
                {adv.toLocaleString("en-IN")} advancing ({advPct.toFixed(1)}%)
              </p>
            ) : null}
            {dec != null && decPct != null ? (
              <p className="text-[#A52F38]">
                <span className="mr-1 inline-block size-1.5 rounded-full bg-[#A52F38]" aria-hidden />
                {dec.toLocaleString("en-IN")} declining ({decPct.toFixed(1)}%)
              </p>
            ) : null}
          </div>
        </div>
        {total > 0 ? (
          <div
            role="img"
            aria-label={`${adv} advances and ${dec} declines`}
            className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-stone-200"
          >
            <div className="bg-[#26713D]" style={{ width: `${advPct ?? 0}%` }} />
            <div className="flex-1 bg-[#A52F38]" />
          </div>
        ) : (
          <p className="mt-3 text-xs text-stone-500">Advances / declines unavailable</p>
        )}
      </div>
    </section>
  );
}
