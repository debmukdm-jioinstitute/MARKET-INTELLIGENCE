"use client";

import { Bars } from "@/components/charts/terminal-charts";
import { PageHeader, Panel } from "@/components/layout/page-header";
import { Progress } from "@/components/ui/progress";
import { MetricInfo } from "@/components/ui/metric-info";
import { useMyPortfolio } from "@/hooks/use-my-portfolio";
import { BENCHMARK_LABEL } from "@/lib/my-portfolio/benchmark-options";
import { findMetric } from "@/lib/my-portfolio/find-metric";
import { formatPct } from "@/lib/format";
import Link from "next/link";
import { useMemo } from "react";

/** Policy limits for progress bars (illustrative desk budgets). */
const POLICY = {
  vol: 0.2,
  maxDrawdown: 0.35,
  trackingError: 0.08,
  varNavPct: 0.02,
};

function budgetPct(value: number | null | undefined, limit: number): number {
  if (value == null || !Number.isFinite(value) || limit <= 0) return 0;
  return Math.min(100, (Math.abs(value) / limit) * 100);
}

export default function RiskPage() {
  const { data, loading, error, locked } = useMyPortfolio();

  const vol = data ? findMetric(data.categories, "volatility") : undefined;
  const mdd = data ? findMetric(data.categories, "maxDrawdown") : undefined;
  const var95 = data ? findMetric(data.categories, "var") : undefined;
  const te = data ? findMetric(data.categories, "trackingError") : undefined;

  const factors = useMemo(() => {
    if (!data) return [];
    const cat = data.categories.find((c) => c.id === "factor");
    if (!cat) return [];
    return cat.metrics
      .filter((m) => m.status === "ok" && m.value != null && Number.isFinite(m.value))
      .map((m) => ({ name: m.label.replace(/^Factor:\s*/i, ""), value: m.value as number }));
  }, [data]);

  const riskBars = useMemo(
    () =>
      (data?.riskContribution ?? []).map((r) => ({
        name: r.symbol,
        value: r.riskShare,
      })),
    [data?.riskContribution],
  );

  const varLimitInr = data?.navInr ? data.navInr * POLICY.varNavPct : null;
  const varUsed =
    var95?.value != null && varLimitInr != null && varLimitInr > 0
      ? budgetPct(var95.value, varLimitInr)
      : 0;

  const bench = data?.settings.benchmark ? BENCHMARK_LABEL[data.settings.benchmark] : "benchmark";

  return (
    <div className="portal-page pb-10">
      <PageHeader
        kicker="Risk"
        title="What could go wrong"
        subtitle={
          data?.hasHoldings
            ? `How much you could lose vs ${bench}, and where risk is concentrated in your holdings.`
            : "How much you could lose, and where the risk is concentrated. Add your holdings to see it."
        }
      />

      {loading && !data ? <p className="text-sm text-muted-foreground">Loading portfolio analysis…</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {!loading && data && !data.hasHoldings ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
          {locked ? (
            <>
              <Link href="/login?next=/portfolio/risk" className="font-semibold text-blue-600 hover:underline">
                Log in
              </Link>{" "}
              to import or add holdings, then return here for VaR and drawdown.
            </>
          ) : (
            <>
              No positions yet.{" "}
              <Link href="/portfolio" className="font-semibold text-blue-600 hover:underline">
                Open Portfolio
              </Link>{" "}
              to add names or import from your broker.
            </>
          )}
        </div>
      ) : null}

      {data?.hasHoldings ? (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            <RiskStat
              metricId="volatility"
              label="Volatility"
              value={vol?.formatted ?? "—"}
              note={vol?.note}
              used={budgetPct(vol?.value ?? null, POLICY.vol)}
              cap="20% ann. policy"
            />
            <RiskStat
              metricId="maxDrawdown"
              label="Max drawdown"
              value={mdd?.formatted ?? "—"}
              note={mdd?.note}
              used={budgetPct(mdd?.value ?? null, POLICY.maxDrawdown)}
              cap="35% limit"
            />
            <RiskStat
              metricId="var"
              label="1-day 95% VaR"
              value={var95?.formatted ?? "—"}
              note={var95?.note ?? (varLimitInr ? `Policy band ≈ ${Math.round(varLimitInr).toLocaleString("en-IN")} INR (2% NAV)` : undefined)}
              used={varUsed}
              cap="Historical · 2% NAV band"
            />
            <RiskStat
              metricId="trackingError"
              label="Tracking error"
              value={te?.formatted ?? "—"}
              note={te?.note}
              used={budgetPct(te?.value ?? null, POLICY.trackingError)}
              cap={`8% TE vs ${bench}`}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Panel title="Risk contribution" subtitle="Weight × name vol (ann.), normalized to 100%">
              <div className="h-[320px]">
                {riskBars.length ? (
                  <Bars data={riskBars} />
                ) : (
                  <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Need a few days of price history per holding.
                  </p>
                )}
              </div>
            </Panel>
            <Panel title="Factor book" subtitle="Portfolio-weighted factor proxies from fundamentals & history">
              <div className="h-[320px]">
                {factors.length ? (
                  <Bars data={factors} unit="raw" />
                ) : (
                  <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Factor loadings populate once history and fundamentals are available.
                  </p>
                )}
              </div>
            </Panel>
          </div>
        </>
      ) : null}
    </div>
  );
}

function RiskStat({
  metricId,
  label,
  value,
  note,
  used,
  cap,
}: {
  metricId: string;
  label: string;
  value: string;
  note?: string;
  used: number;
  cap: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-sm uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
        <MetricInfo id={metricId} name={label} iconSize="xs" />
      </div>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      <Progress value={used} className="mt-3" />
      <p className="mt-2 text-sm text-muted-foreground">
        {cap} · {formatPct(used / 100, 0)} utilized
      </p>
      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
    </div>
  );
}
