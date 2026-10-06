"use client";

import type { SecurityRisk } from "@/lib/feeds/security-risk";
import { MetricInfo } from "@/components/ui/metric-info";
import useSWR from "swr";

const fetcher = async (url: string): Promise<SecurityRisk> => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
};

interface StatProps {
  label: string;
  value: string;
  metricKey: string;
  name: string;
  explanation: string;
  utility: string;
  calculation: string;
  asOf?: string;
}

const StatCard = ({ label, value, metricKey, name, explanation, utility, calculation, asOf }: StatProps) => (
  <div className="rounded-lg border border-border/70 p-3 relative group">
    <div className="flex items-center justify-between gap-1">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground truncate">{label}</p>
      <MetricInfo
        id={metricKey}
        name={name}
        laymanExplanation={explanation}
        utility={utility}
        calculation={calculation}
        value={value}
        asOf={asOf}
        size="xs"
      />
    </div>
    <p className="mt-1 text-lg font-bold tabular-nums text-foreground">{value}</p>
  </div>
);

export function SecurityRiskPanel({ symbol }: { symbol: string }) {
  const { data: r, error, isLoading } = useSWR(`/api/feeds/security-risk?symbol=${encodeURIComponent(symbol)}`, fetcher, { revalidateOnFocus: false });
  if (isLoading) return <p className="text-sm text-muted-foreground">Computing risk statistics…</p>;
  if (error || !r) return <p className="text-sm text-muted-foreground">Risk statistics unavailable{error ? `: ${error.message}` : ""}.</p>;
  const cur = r.market === "IN" ? "₹" : "$";
  const benchmarkName = r.beta?.benchmark ?? (r.market === "IN" ? "NIFTY 50" : "S&P 500");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Realized vol (1y)"
          value={r.realizedVolPct != null ? `${r.realizedVolPct.toFixed(1)}%` : "—"}
          metricKey="realized_volatility"
          name="Realized Volatility (1Y)"
          explanation="Measures how wildly stock price swings over 1 year. High percentage means wild price jumps, low percentage means calm steady movement."
          utility="Helps you size your trade correctly: high-volatility stocks require smaller position sizes to manage portfolio risk."
          calculation="Annualized standard deviation of daily log returns over past 252 sessions: σ × √252."
          asOf={r.asOf}
        />
        <StatCard
          label="ATR (14d)"
          value={r.atr14 != null ? `${cur}${r.atr14.toFixed(2)}` : "—"}
          metricKey="atr"
          name="Average True Range (14D)"
          explanation="The average price distance in currency (₹ or $) this stock moves in a single day. Shows normal daily noise bounds."
          utility="Crucial for setting stop-loss levels and daily profit targets so normal price noise doesn't trigger stop-outs."
          calculation="Wilder's 14-day exponential moving average of True Range: max(H-L, |H-Cp|, |L-Cp|)."
          asOf={r.asOf}
        />
        <StatCard
          label="ATR % of price"
          value={r.atrPctOfPrice != null ? `${r.atrPctOfPrice.toFixed(2)}%` : "—"}
          metricKey="atr_pct"
          name="ATR as % of Stock Price"
          explanation="Daily move size normalized as a percentage of current stock price. Allows comparing daily volatility across stocks of any price level."
          utility="Helps compare daily volatility between cheap and expensive stocks (e.g. ₹100 stock vs ₹5,000 stock)."
          calculation="(14-day ATR ÷ Current Last Traded Price) × 100."
          asOf={r.asOf}
        />
        <StatCard
          label="Max drawdown (1y)"
          value={r.maxDrawdownPct != null ? `${r.maxDrawdownPct.toFixed(1)}%` : "—"}
          metricKey="max_drawdown"
          name="Max Drawdown (1Y)"
          explanation="The worst peak-to-trough price fall experienced over the past 12 months. Shows maximum pain a buyer suffered."
          utility="Measures worst-case downside risk and emotional stress level you must be prepared to handle."
          calculation="Worst percentage loss from rolling peak close to subsequent trough close."
          asOf={r.asOf}
        />
        <StatCard
          label={`Beta vs ${benchmarkName}`}
          value={r.beta ? r.beta.value.toFixed(2) : "—"}
          metricKey="beta"
          name={`Beta vs ${benchmarkName}`}
          explanation={`Sensitivity to benchmark index. Beta > 1.0 means stock swings more than ${benchmarkName}; Beta < 1.0 means stock is calmer than index.`}
          utility="Helps balance portfolio market exposure: high-beta boosts gains in bull markets but drops harder in market corrections."
          calculation={`OLS slope of daily stock returns vs ${benchmarkName} returns over 1 year.`}
          asOf={r.asOf}
        />
        <StatCard
          label="52-week range"
          value={r.range52w ? `${r.range52w.positionPct.toFixed(0)}% of range` : "—"}
          metricKey="range52w"
          name="52-Week Price Range Position"
          explanation="Where current price sits between 1-year low (0%) and 1-year high (100%). Indicates current momentum vs valuation location."
          utility="Helps decide entry timing: near 100% means trading near 52W high (momentum), near 0% means trading near 52W low (value/rebound)."
          calculation="((Current Price − 52W Low) ÷ (52W High − 52W Low)) × 100."
          asOf={r.asOf}
        />
      </div>
      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-lg border border-border/70 p-3">
          <div className="flex items-center justify-between gap-1">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Next earnings</p>
            <MetricInfo
              id="earnings_date"
              name="Upcoming Earnings Release Date"
              laymanExplanation="Expected date when company announces quarterly financial results (revenue, profit, guidance)."
              utility="Volatility spikes around earnings dates. Traders can adjust risk or avoid opening new positions right before announcements."
              calculation="Fetched from exchange calendar or historical reporting timeline estimate."
              size="xs"
              asOf={r.asOf}
            />
          </div>
          <p className="mt-0.5 text-foreground">
            {r.nextEarnings ? `${r.nextEarnings.date}${r.nextEarnings.isEstimate ? " (estimated)" : ""}` : r.market === "IN" ? "Not on file" : "Not shown for US names here"}
          </p>
        </div>
        <div className="rounded-lg border border-border/70 p-3">
          <div className="flex items-center justify-between gap-1">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recent insider filings</p>
            <MetricInfo
              id="insider_filings"
              name="Insider & Promoter Disclosure Filings"
              laymanExplanation="Official disclosures of share buying/selling by company directors, key executives, or major shareholders."
              utility="Insider buying often signals management confidence; heavy insider selling can warrant deeper fundamental check."
              calculation="Scraped from exchange regulatory disclosures (NSE/BSE SAST/PIT or US SEC Form 4)."
              size="xs"
              asOf={r.asOf}
            />
          </div>
          {r.insiderFilings?.length ? (
            <ul className="mt-0.5 space-y-0.5">
              {r.insiderFilings.slice(0, 5).map((f) => (
                <li key={f.url}>
                  <span className="tabular-nums text-muted-foreground">{f.date}</span>{" "}
                  <a href={f.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{f.form}</a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-0.5 text-muted-foreground">{r.insiderNote}</p>
          )}
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{r.method} As of {r.asOf}. Not a rating or recommendation.</p>
    </div>
  );
}
