"use client";

import { YieldCurveCard } from "@/components/macro/yield-curve-card";
import { PageHeader, Panel } from "@/components/layout/page-header";
import { MacroTapeSkeleton } from "@/components/macro/macro-tape-skeleton";
import { MetricExplainer } from "@/components/macro/metric-explainer";
import { useMacroTape } from "@/hooks/use-macro-tape";
import Link from "next/link";

export default function YieldsMacroPage() {
  const { data, loading, error } = useMacroTape();

  return (
    <div className="portal-page">
      <PageHeader
        kicker="Macro"
        title="Yield curve"
        subtitle="India government bond yields vs US curve — US rates often steer global capital flows into or out of India."
      />
      <Link href="/macro" className="text-sm text-primary hover:underline">← Macro home</Link>
      {loading && !data ? <MacroTapeSkeleton count={2} /> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {data ? (
        <>
          <YieldCurveCard india={data.indiaYieldCurve} us={data.usYieldCurve} />
          <Panel title="How to read this">
            <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              <li className="flex items-start gap-1">
                <span>
                  A <strong className="text-foreground">steeper</strong> curve (long rates above short) often signals growth
                  expectations or inflation risk.
                </span>
                <MetricExplainer copyKey="yield_in_10y" />
              </li>
              <li>
                When <strong className="text-foreground">US 2Y</strong> rises faster than India short rates, foreign investors
                may demand higher returns to hold Indian assets.
              </li>
              <li>
                Data: India tenors from FRED / live 10Y G-Sec; US from FRED Treasury constant maturity series.
              </li>
            </ul>
          </Panel>
        </>
      ) : null}
    </div>
  );
}
