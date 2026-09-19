"use client";

import { PageHeader, Panel } from "@/components/layout/page-header";
import { usePortfolio } from "@/components/providers/portfolio-provider";
import { analyzePortfolio, mean, stdev } from "@/lib/analytics";
import { formatNumber, formatPct } from "@/lib/format";
import { useMemo } from "react";

export default function QuantPage() {
  const { active } = usePortfolio();
  const a = useMemo(() => analyzePortfolio(active, active.benchmark), [active]);
  const skew = useMemo(() => moment(a.portRets, 3), [a.portRets]);
  const kurt = useMemo(() => moment(a.portRets, 4) - 3, [a.portRets]);
  const hit = a.portRets.filter((r) => r > 0).length / a.portRets.length;
  const avgUp = mean(a.portRets.filter((r) => r > 0));
  const avgDn = mean(a.portRets.filter((r) => r < 0));

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Quantitative analysis"
        title="Return distribution & active statistics"
        subtitle="Daily return moments, hit rate, and CAPM identity for the selected book versus its benchmark."
      />
      <div className="grid gap-3 md:grid-cols-4">
        <Q label="Daily mean" value={formatPct(mean(a.portRets), 3)} />
        <Q label="Daily sigma" value={formatPct(stdev(a.portRets), 3)} />
        <Q label="Skewness" value={formatNumber(skew)} />
        <Q label="Excess kurtosis" value={formatNumber(kurt)} />
        <Q label="Hit rate" value={formatPct(hit, 1)} />
        <Q label="Avg up day" value={formatPct(avgUp, 2)} />
        <Q label="Avg down day" value={formatPct(avgDn, 2)} />
        <Q label="Beta" value={formatNumber(a.beta)} />
      </div>
      <Panel title="How to read this">
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Sharpe uses a 4.5% risk-free rate, 252-day annualization.</li>
          <li>Sortino uses only negative daily returns in the denominator.</li>
          <li>Alpha is the CAPM intercept annualized: Rf + β(Rm − Rf).</li>
          <li>Information ratio is mean residual versus tracking error.</li>
        </ul>
      </Panel>
    </div>
  );
}

function moment(values: number[], p: number) {
  const m = mean(values);
  const s = stdev(values);
  if (!s) return 0;
  return mean(values.map((v) => ((v - m) / s) ** p));
}

function Q({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-heading text-2xl">{value}</p>
    </div>
  );
}
