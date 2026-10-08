"use client";

/**
 * Research analytics section for /research/[symbol] (India symbols only).
 *
 * Fetches the cached Phase 1 analytics payload (Financial X-Ray, MI Financial
 * DNA, Red Flag Engine, Historical Valuation) and renders the four panels
 * plus a methodology disclosure. Pure composition: all math happens
 * server-side in /api/research/analytics.
 */

import useSWR from "swr";
import { Panel } from "@/components/layout/page-header";
import { Fold } from "@/components/guide/explain";
import type { CompanyResearchAnalytics } from "@/lib/research/analytics-types";
import {
  FinancialXRayPanel,
  FinancialXRaySkeleton,
} from "@/components/research/financial-xray-panel";
import {
  FinancialDnaPanel,
  FinancialDnaSkeleton,
} from "@/components/research/financial-dna-panel";
import { RedFlagsPanel, RedFlagsSkeleton } from "@/components/research/red-flags-panel";
import {
  ValuationBandsPanel,
  ValuationBandsSkeleton,
} from "@/components/research/valuation-bands-panel";

/** Module-level fetcher: never inline an async fn in useSWR (React #185). */
async function loadAnalytics(url: string): Promise<CompanyResearchAnalytics> {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json as CompanyResearchAnalytics;
}

function MethodologyFold() {
  return (
    <Fold title="How these analytics are calculated">
      <div className="space-y-3 text-xs leading-relaxed text-muted-foreground">
        <p>
          <span className="font-semibold text-foreground">Formulas. </span>
          Growth uses compound annual growth rate over reported annual periods.
          Margins are profit lines divided by revenue. ROE is PAT over average
          shareholders&apos; equity; ROCE is EBIT over average capital employed.
          Net debt is total debt minus cash. Free cash flow is operating cash
          flow minus capital expenditure. Valuation multiples divide historical
          prices by fundamentals reported on or before each observation date.
        </p>
        <p>
          <span className="font-semibold text-foreground">MI Financial DNA. </span>
          A deterministic 0 to 100 score across five categories (Growth 20%,
          Profitability 25%, Cash Quality 20%, Balance Sheet 20%, Capital
          Efficiency 15%). Categories that cannot be scored from reported data
          are excluded and the remaining weights are renormalized; they are
          never filled with zero. It is a rules-based snapshot, not an
          investment recommendation.
        </p>
        <p>
          <span className="font-semibold text-foreground">Missing data. </span>
          A metric shows Unavailable when an input is missing, Insufficient
          history when too few periods exist, and Not applicable when the
          metric does not fit the company type (for example inventory days for
          banks). Missing values are never replaced with zero or interpolated.
        </p>
        <p>
          <span className="font-semibold text-foreground">Sources. </span>
          Financial statements come from NSE corporate filings (XBRL); prices
          come from market data. Derived metrics cite their inputs. Analytics
          are recomputed when new financial statements arrive and served from
          cache otherwise.
        </p>
        <p>
          <span className="font-semibold text-foreground">Limitations. </span>
          Flags highlight patterns worth investigating, not misconduct.
          Valuation bands compare the company only with its own history.
          Banks and NBFCs skip industrial leverage and efficiency metrics.
        </p>
      </div>
    </Fold>
  );
}

export function ResearchAnalyticsSection({ symbol }: { symbol: string }) {
  const { data, error, isLoading } = useSWR<CompanyResearchAnalytics>(
    `/api/research/analytics?symbol=${encodeURIComponent(symbol)}`,
    loadAnalytics,
    { revalidateOnFocus: false, dedupingInterval: 600_000 },
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <FinancialXRaySkeleton />
        <FinancialDnaSkeleton />
        <RedFlagsSkeleton />
        <ValuationBandsSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Panel
        id="research-analytics"
        title="Financial analytics"
        subtitle="X-Ray, DNA score, red flags and valuation history from reported financials."
      >
        <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">Data temporarily unavailable.</p>
        </div>
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      <FinancialXRayPanel xray={data.financialXRay} />
      <FinancialDnaPanel dna={data.financialDNA} />
      <RedFlagsPanel result={data.redFlags} />
      <ValuationBandsPanel valuation={data.historicalValuation} />
      <MethodologyFold />
    </div>
  );
}
