"use client";

import { NewsStream } from "@/components/feeds/news-stream";
import { SourceHealthGrid } from "@/components/feeds/source-health";
import { PageHeader, Panel } from "@/components/layout/page-header";
import { formatPct } from "@/lib/format";
import { useFeedHub } from "@/hooks/use-feed-hub";
import { cn } from "@/lib/utils";

export default function FeedsPage() {
  const { data, loading, error, reload } = useFeedHub(45_000);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Data plane"
        title="Live market feeds"
        subtitle="Aggregated RSS and open APIs — NSE, BSE, RBI, SEC EDGAR, Yahoo Finance, Stooq, Alpha Vantage, FRED, World Bank, IMF, OECD, MOSPI, and India benchmarks. Refreshes automatically."
      />
      <button
        type="button"
        onClick={() => reload()}
        className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent"
      >
        Refresh now
      </button>
      {loading && !data ? (
        <p className="text-sm text-muted-foreground">Pulling feeds…</p>
      ) : null}
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      {data ? (
        <>
          <Panel title="Source health" subtitle={`Last hub sync ${new Date(data.fetchedAt).toLocaleString()}`}>
            <SourceHealthGrid rows={data.health} />
          </Panel>
          <div className="grid gap-4 xl:grid-cols-2">
            <Panel title="Regulatory & exchange headlines">
              <NewsStream items={data.news} limit={24} />
            </Panel>
            <Panel title="India benchmarks (NSE / BSE via live quotes)">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-2">Symbol</th>
                    <th className="text-right">Last</th>
                    <th className="text-right">Chg</th>
                  </tr>
                </thead>
                <tbody>
                  {data.indices.map((row) => (
                    <tr key={row.symbol} className="border-t border-border">
                      <td className="py-2 font-mono">{row.symbol}</td>
                      <td className="py-2 text-right font-mono">{row.price.toFixed(2)}</td>
                      <td
                        className={cn(
                          "py-2 text-right font-mono",
                          row.changePct >= 0 ? "text-emerald-400" : "text-rose-400",
                        )}
                      >
                        {formatPct(row.changePct)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          </div>
        </>
      ) : null}
    </div>
  );
}
