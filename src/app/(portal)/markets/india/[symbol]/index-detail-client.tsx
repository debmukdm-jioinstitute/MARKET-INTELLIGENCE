"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { ArrowLeft } from "lucide-react";
import { IndexConstituentsPanel } from "@/components/india-markets/index-constituents-panel";
import { MarketStatusBadge } from "@/components/feeds/market-status-badge";
import { PriceBento } from "@/components/price-bento/price-bento";
import { useBentoSeries } from "@/hooks/use-bento-series";
import { useFeedHub } from "@/hooks/use-feed-hub";
import { useMarketStatus } from "@/hooks/use-market-status";
import { fmtNum } from "@/lib/format-india";
import { INDIA_BENCHMARK_DEFS } from "@/lib/feeds/india/indices";
import { indexSlugFromLabel } from "@/lib/india-index-meta";
import { BENTO_TFS, type BentoTf } from "@/lib/price-bento/model";
import { cn } from "@/lib/utils";

/** Module-level fetcher (repo rule: never inline an async fetcher in a hook body). */
const fetchJson = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
};

type SecurityDetail = {
  details?: { fiftyTwoWeekHigh?: number; fiftyTwoWeekLow?: number };
  history?: { date: string; value: number }[];
};

/**
 * The 26 benchmarks with detail pages, in listing order
 * (def order = feed-hub fetch order = card order on /markets/india).
 * Defs without a canonical slug (BSE 100/200/500, Bankex, …) are skipped.
 */
const INDEX_SWITCHER: ReadonlyArray<{ slug: string; label: string }> =
  INDIA_BENCHMARK_DEFS.flatMap((d) => {
    const s = indexSlugFromLabel(d.label);
    return s ? [{ slug: s, label: d.label }] : [];
  });

const TFS_NO_INTRADAY: readonly BentoTf[] = BENTO_TFS.filter((t) => t !== "1D");

export function IndexDetailClient({
  slug,
  label,
  name,
  yahoo,
  upstoxKey,
}: {
  slug: string;
  label: string;
  name: string;
  yahoo: string;
  upstoxKey?: string;
}) {
  const { data: feedData, reload: refetchFeed } = useFeedHub(30_000);
  const { isOpen } = useMarketStatus();
  const [tfRaw, setTf] = useState<BentoTf>("1D");
  // Indices without an Upstox key have daily history only — never offer a fake intraday view.
  const tfs = upstoxKey ? BENTO_TFS : TFS_NO_INTRADAY;
  const tf: BentoTf = tfs.includes(tfRaw) ? tfRaw : tfs[0];

  // Keep the active pill visible in the switcher strip (mount + slug change).
  // DOM scroll only — no state, so no render loop.
  const activePillRef = useRef<HTMLAnchorElement | null>(null);
  useEffect(() => {
    activePillRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [slug]);

  const quote = useMemo(
    () => feedData?.indices.find((q) => q.symbol === label || q.symbol === yahoo) ?? null,
    [feedData, label, yahoo],
  );
  const liveNow = isOpen && !quote?.stale;

  const { data: secDetail } = useSWR<SecurityDetail>(
    `/api/feeds/security/${encodeURIComponent(yahoo)}`,
    fetchJson,
    { revalidateOnFocus: false, dedupingInterval: 600_000 },
  );

  const high52 = secDetail?.details?.fiftyTwoWeekHigh ?? null;
  const low52 = secDetail?.details?.fiftyTwoWeekLow ?? null;
  const pct52 =
    high52 != null && low52 != null && high52 > low52 && quote
      ? Math.min(100, Math.max(0, ((quote.price - low52) / (high52 - low52)) * 100))
      : null;

  const s = useBentoSeries({ candleSymbol: upstoxKey ?? null, dailyFallback: secDetail?.history, tf });
  const prevClose = quote ? quote.price - quote.change : null;

  return (
    <div className="portal-page space-y-5 pb-10">
      <div className="flex items-center justify-between">
        <Link
          href="/markets/india"
          className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-[#1a73e8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a73e8] rounded"
        >
          <ArrowLeft className="size-3.5 text-[#1a73e8]" />
          Back to India markets
        </Link>
        <MarketStatusBadge />
      </div>

      <h1 className="sr-only">
        {label} — {name}
      </h1>

      {/* Index switcher strip — one-tap hop between benchmarks */}
      <nav aria-label="Switch benchmark index">
        <div className="no-scrollbar flex gap-2 overflow-x-auto py-1" role="list">
          {INDEX_SWITCHER.map((idx) => {
            const isActive = idx.slug === slug;
            return (
              <Link
                key={idx.slug}
                ref={isActive ? activePillRef : undefined}
                href={`/markets/india/${idx.slug}`}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-[44px] shrink-0 items-center whitespace-nowrap rounded-full border px-3.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a73e8]",
                  isActive
                    ? "border-[#1a73e8] bg-[#1a73e8] text-white"
                    : "border-border bg-card text-muted-foreground hover:border-[#1a73e8]/60 hover:text-foreground",
                )}
              >
                {idx.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <PriceBento
        name={label}
        unit="index"
        tz="Asia/Kolkata"
        session={liveNow ? "open" : "closed"}
        close={quote?.price ?? null}
        prevClose={prevClose}
        dayLow={s.dayRange?.low ?? null}
        dayHigh={s.dayRange?.high ?? null}
        asOf={quote?.asOf ?? null}
        stale={quote?.stale}
        tf={tf}
        onTfChange={setTf}
        tfs={tfs}
        series={s.series}
        seriesLoading={s.loading}
        seriesError={s.error}
        onRetrySeries={s.retry}
        onRetryQuote={() => void refetchFeed()}
        source={s.source ?? (quote ? quote.provider : null)}
      />

      {pct52 != null && high52 != null && low52 != null ? (
        <div className="bento-card-shell space-y-1.5 text-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>52W low {fmtNum(low52, 2)}</span>
            <span>52W high {fmtNum(high52, 2)}</span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary/80">
            <div className="h-full rounded-full bg-[#1a73e8]" style={{ width: `${pct52}%` }} />
          </div>
          <p className="text-right text-muted-foreground">
            Now at <strong className="text-[#1a73e8]">{pct52.toFixed(1)}%</strong> of the 52-week range (Yahoo Finance)
          </p>
        </div>
      ) : null}

      {/* Constituents */}
      <IndexConstituentsPanel slug={slug} />
    </div>
  );
}
