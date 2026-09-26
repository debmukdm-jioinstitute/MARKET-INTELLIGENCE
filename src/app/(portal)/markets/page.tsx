"use client";

import { PageHeader } from "@/components/layout/page-header";
import { MetricInfo } from "@/components/ui/metric-info";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { quoteMap, useFeedHub } from "@/hooks/use-feed-hub";
import { formatPct } from "@/lib/format";
import { getReturn, lastClose } from "@/lib/market";
import { UNIVERSE } from "@/lib/universe";
import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function MarketsPage() {
  const router = useRouter();
  const { data, loading, hubSyncedAt } = useFeedHub(60_000);
  const live = quoteMap(data);

  const rows = UNIVERSE.map((u) => {
    const q = live.get(u.symbol);
    const simLast = lastClose(u.symbol);
    const last = q?.price ?? simLast;
    const d1 = q?.changePct ?? getReturn(u.symbol, 1);
    return {
      ...u,
      last,
      d1,
      m1: getReturn(u.symbol, 21),
      y1: getReturn(u.symbol, 252),
      live: Boolean(q),
      asOf: q?.asOf ?? hubSyncedAt,
    };
  });

  return (
    <div className="portal-page">
      <PageHeader
        kicker="Market data"
        title="Investable universe"
        subtitle="Live last prices from Yahoo Finance chart API / Stooq. Click a row to open full research, or ⓘ for source and fetch time."
      />
      {hubSyncedAt ? (
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          Hub sync {new Date(hubSyncedAt).toLocaleString()}
          <MetricInfo id="data_quality" asOf={hubSyncedAt} iconSize="xs" />
        </p>
      ) : null}
      {loading && !data ? (
        <p className="text-sm text-muted-foreground">Connecting to feed hub…</p>
      ) : null}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Class</TableHead>
              <TableHead className="text-right">
                <span className="inline-flex items-center gap-1 justify-end">
                  Last
                  <MetricInfo id="nav" name="Last Traded Price" iconSize="xs" />
                </span>
              </TableHead>
              <TableHead className="text-right">
                <span className="inline-flex items-center gap-1 justify-end">
                  1D
                  <MetricInfo id="today_pnl" name="1-Day Percentage Return" iconSize="xs" />
                </span>
              </TableHead>
              <TableHead className="text-right">1M*</TableHead>
              <TableHead className="text-right">1Y*</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.symbol}
                className="group cursor-pointer"
                onClick={() => router.push(`/research/${encodeURIComponent(row.symbol)}`)}
              >
                <TableCell className="flex items-center gap-1">
                  <span className="group-hover:text-primary group-hover:underline underline-offset-2">{row.symbol}</span>
                  {row.live ? (
                    <span className="ml-1 text-sm uppercase text-emerald-600">live</span>
                  ) : null}
                  <span onClick={(e) => e.stopPropagation()}>
                    <MetricInfo
                      id={row.symbol.toLowerCase()}
                      name={`${row.name} (${row.symbol})`}
                      provider="Yahoo Finance / Global Market Feeds"
                      sourceUrl={`https://finance.yahoo.com/quote/${encodeURIComponent(row.symbol)}`}
                      asOf={row.asOf}
                      iconSize="xs"
                    />
                  </span>
                </TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell className="text-muted-foreground">{row.assetClass}</TableCell>
                <TableCell className="text-right">{row.last.toFixed(2)}</TableCell>
                <Chg v={row.d1} />
                <Chg v={row.m1} />
                <Chg v={row.y1} />
                <TableCell className="pr-3">
                  <ArrowUpRight className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="border-t border-border px-4 py-2 text-sm text-muted-foreground">
          *1M / 1Y from simulated tape until full historical API merge.
        </p>
      </div>
    </div>
  );
}

function Chg({ v }: { v: number }) {
  return (
    <TableCell className={cn("text-right", v >= 0 ? "text-emerald-600" : "text-rose-600")}>
      {formatPct(v)}
    </TableCell>
  );
}
