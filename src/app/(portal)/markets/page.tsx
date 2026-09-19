"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataInfo } from "@/components/feeds/data-info";
import { quoteMap, useFeedHub } from "@/hooks/use-feed-hub";
import { formatPct } from "@/lib/format";
import { getReturn, lastClose } from "@/lib/market";
import { UNIVERSE } from "@/lib/universe";
import { cn } from "@/lib/utils";

export default function MarketsPage() {
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
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Market data"
        title="Investable universe"
        subtitle="Live last prices from Yahoo Finance chart API / Stooq. Click ⓘ on a row for source and fetch time."
      />
      {hubSyncedAt ? (
        <p className="text-xs text-muted-foreground">
          Hub sync {new Date(hubSyncedAt).toLocaleString()}
          <DataInfo
            source={{ provider: "Feed hub", url: "/api/feeds/hub", asOf: hubSyncedAt }}
            hubSyncedAt={hubSyncedAt}
            note="Universe marks refresh on this interval."
          />
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
              <TableHead className="text-right">Last</TableHead>
              <TableHead className="text-right">1D</TableHead>
              <TableHead className="text-right">1M*</TableHead>
              <TableHead className="text-right">1Y*</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.symbol}>
                <TableCell className="font-mono">
                  {row.symbol}
                  {row.live ? (
                    <span className="ml-1 text-[9px] uppercase text-emerald-400">live</span>
                  ) : null}
                </TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell className="text-muted-foreground">{row.assetClass}</TableCell>
                <TableCell className="text-right font-mono">{row.last.toFixed(2)}</TableCell>
                <Chg v={row.d1} />
                <Chg v={row.m1} />
                <Chg v={row.y1} />
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
          *1M / 1Y from simulated tape until full historical API merge.
        </p>
      </div>
    </div>
  );
}

function Chg({ v }: { v: number }) {
  return (
    <TableCell className={cn("text-right font-mono", v >= 0 ? "text-emerald-400" : "text-rose-400")}>
      {formatPct(v)}
    </TableCell>
  );
}
