"use client";

import { PageHeader, Panel } from "@/components/layout/page-header";
import { MetricInfo } from "@/components/ui/metric-info";
import { useMyPortfolio } from "@/hooks/use-my-portfolio";
import { findMetric } from "@/lib/my-portfolio/find-metric";
import { covariance, mean, returnsFromPrices, stdev } from "@/lib/analytics";
import { formatNumber, formatPct } from "@/lib/format";
import Link from "next/link";
import { useMemo } from "react";
import { signClass } from "@/lib/sign-color";
import { cn } from "@/lib/utils";

export default function QuantPage() {
  const { data, loading, error, locked } = useMyPortfolio();

  const portRets = useMemo(() => {
    if (!data?.navSeries?.length) return [];
    return returnsFromPrices(data.navSeries.map((p) => p.portfolio));
  }, [data]);

  const benchRets = useMemo(() => {
    if (!data?.navSeries?.length) return [];
    return returnsFromPrices(data.navSeries.map((p) => p.benchmark));
  }, [data]);

  const beta = useMemo(() => {
    const n = Math.min(portRets.length, benchRets.length);
    if (n < 5) return findMetric(data?.categories ?? [], "beta")?.value ?? null;
    const p = portRets.slice(-n);
    const b = benchRets.slice(-n);
    return covariance(p, b) / Math.max(stdev(b) ** 2, 1e-12);
  }, [portRets, benchRets, data]);

  const skew = useMemo(() => moment(portRets, 3), [portRets]);
  const kurt = useMemo(() => moment(portRets, 4) - 3, [portRets]);
  const hit = portRets.length > 0 ? portRets.filter((r) => r > 0).length / portRets.length : 0;
  const avgUp = portRets.some((r) => r > 0) ? mean(portRets.filter((r) => r > 0)) : 0;
  const avgDn = portRets.some((r) => r < 0) ? mean(portRets.filter((r) => r < 0)) : 0;

  return (
    <div className="portal-page">
      <PageHeader
        kicker="Quant"
        title="The numbers behind your returns"
        subtitle={
          data?.hasHoldings
            ? "How steady your returns are, and how you compare to the market."
            : "How steady your returns are, and how you compare to the market. Add your holdings to calculate them."
        }
      />

      {loading && !data ? <p className="text-sm text-muted-foreground">Loading portfolio…</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {!loading && data && !data.hasHoldings ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
          {locked ? (
            <>
              <Link href="/login?next=/portfolio/quant" className="font-semibold text-blue-600 hover:underline">
                Log in
              </Link>{" "}
              to import holdings.
            </>
          ) : (
            <>
              No positions.{" "}
              <Link href="/portfolio" className="font-semibold text-blue-600 hover:underline">
                Open Portfolio
              </Link>
            </>
          )}
        </div>
      ) : null}

      {data?.hasHoldings && portRets.length >= 3 ? (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            <Q metricId="total_return" label="Daily mean" value={formatPct(mean(portRets), 3)} signed />
            <Q metricId="beta" label="Daily sigma" value={formatPct(stdev(portRets), 3)} />
            <Q metricId="var_95" label="Skewness" value={formatNumber(skew)} />
            <Q metricId="cvar" label="Excess kurtosis" value={formatNumber(kurt)} />
            <Q metricId="alpha" label="Hit rate" value={formatPct(hit, 1)} />
            <Q metricId="today_pnl" label="Avg up day" value={formatPct(avgUp, 2)} signed />
            <Q metricId="today_pnl" label="Avg down day" value={formatPct(avgDn, 2)} signed />
            <Q metricId="beta" label="Beta" value={beta != null ? formatNumber(beta) : "—"} />
          </div>
          <Panel title="How to read this">
            <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Daily stats use your combined holdings NAV path (same engine as Risk).</li>
              <li>Beta aligns portfolio and benchmark returns on overlapping NAV dates.</li>
            </ul>
          </Panel>
        </>
      ) : data?.hasHoldings ? (
        <p className="text-sm text-muted-foreground">Need a few days of price history for distribution stats.</p>
      ) : null}
    </div>
  );
}

function moment(values: number[], p: number) {
  if (values.length < 3) return 0;
  const m = mean(values);
  const s = stdev(values);
  if (!s) return 0;
  return mean(values.map((v) => ((v - m) / s) ** p));
}

function Q({ metricId, label, value, signed = false }: { metricId?: string; label: string; value: string; signed?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-sm uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
        <MetricInfo id={metricId ?? "beta"} name={label} iconSize="xs" />
      </div>
      <p className={cn("mt-1 font-heading text-2xl tabular-nums", signed && signClass(value))}>{value}</p>
    </div>
  );
}
