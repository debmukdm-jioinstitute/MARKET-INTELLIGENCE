"use client";

import { PageHeader, Panel } from "@/components/layout/page-header";
import { useMyPortfolio } from "@/hooks/use-my-portfolio";
import { formatInr } from "@/lib/format";
import useSWR from "swr";
import type { TradeLogRow } from "@/lib/my-portfolio/types";
import Link from "next/link";
import { signClass } from "@/lib/sign-color";
import { cn } from "@/lib/utils";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json as { trades: TradeLogRow[] };
};

export default function PortfolioActivityPage() {
  const { data, loading, error, locked, holdings } = useMyPortfolio();
  const { data: tradePayload } = useSWR(locked ? null : "/api/portfolio/trades", fetcher);

  const trades = tradePayload?.trades ?? [];
  const avgCostBySymbol = new Map(holdings.map((h) => [h.symbol.toUpperCase(), h.avgCost]));
  let realized = 0;
  for (const t of trades.filter((x) => x.side === "SELL")) {
    const basis = avgCostBySymbol.get(t.symbol.toUpperCase()) ?? t.price;
    realized += (t.price - basis) * t.shares;
  }

  return (
    <div className="portal-page pb-10">
      <PageHeader

        title="Trade ledger"
        subtitle="Buys and sells recorded from adds, edits, sells, and imports."
      />

      {loading && !data ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {locked ? (
        <p className="text-sm text-muted-foreground">
          <Link href="/login?next=/portfolio/activity" className="font-semibold text-blue-600 hover:underline">
            Log in
          </Link>{" "}
          to view your ledger.
        </p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-6 text-sm">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Realized P&L (approx)</p>
              <p className={cn("font-semibold tabular-nums", signClass(realized))}>{formatInr(realized)}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Unrealized (book)</p>
              <p className="font-semibold tabular-nums">
                {formatInr(data?.positions.reduce((s, p) => s + p.pnlInr, 0) ?? 0)}
              </p>
            </div>
          </div>

          <Panel title="Recent trades" subtitle={`${trades.length} rows`}>
            {trades.length === 0 ? (
              <p className="text-sm text-muted-foreground">No trades yet — add or sell a holding to populate the log.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="py-2 pr-3">Date</th>
                      <th className="py-2 pr-3">Symbol</th>
                      <th className="py-2 pr-3">Side</th>
                      <th className="py-2 pr-3 text-right">Shares</th>
                      <th className="py-2 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((t, i) => (
                      <tr key={`${t.symbol}-${t.date}-${i}`} className="border-b border-border/60">
                        <td className="py-2 pr-3">{t.date}</td>
                        <td className="py-2 pr-3 font-medium">{t.symbol}</td>
                        <td className="py-2 pr-3">{t.side}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{t.shares}</td>
                        <td className="py-2 text-right tabular-nums">{t.price.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
