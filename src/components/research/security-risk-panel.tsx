"use client";

import type { SecurityRisk } from "@/lib/feeds/security-risk";
import useSWR from "swr";

const fetcher = async (url: string): Promise<SecurityRisk> => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
};

const Stat = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div className="rounded-lg border border-border/70 p-3" title={hint}>
    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="mt-0.5 text-lg font-bold tabular-nums text-foreground">{value}</p>
  </div>
);

export function SecurityRiskPanel({ symbol }: { symbol: string }) {
  const { data: r, error, isLoading } = useSWR(`/api/feeds/security-risk?symbol=${encodeURIComponent(symbol)}`, fetcher, { revalidateOnFocus: false });
  if (isLoading) return <p className="text-sm text-muted-foreground">Computing risk statistics…</p>;
  if (error || !r) return <p className="text-sm text-muted-foreground">Risk statistics unavailable{error ? `: ${error.message}` : ""}.</p>;
  const cur = r.market === "IN" ? "₹" : "$";
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Realized vol (1y)" value={r.realizedVolPct != null ? `${r.realizedVolPct.toFixed(1)}%` : "—"} hint="Annualised standard deviation of daily log returns" />
        <Stat label="ATR (14d)" value={r.atr14 != null ? `${cur}${r.atr14.toFixed(2)}` : "—"} hint={r.atrPctOfPrice != null ? `${r.atrPctOfPrice.toFixed(2)}% of price` : undefined} />
        <Stat label="ATR % of price" value={r.atrPctOfPrice != null ? `${r.atrPctOfPrice.toFixed(2)}%` : "—"} />
        <Stat label="Max drawdown (1y)" value={r.maxDrawdownPct != null ? `${r.maxDrawdownPct.toFixed(1)}%` : "—"} hint="Worst peak-to-trough fall on closes" />
        <Stat label={`Beta vs ${r.beta?.benchmark ?? "index"}`} value={r.beta ? r.beta.value.toFixed(2) : "—"} hint={r.beta ? `R² ${r.beta.r2.toFixed(2)}` : undefined} />
        <Stat label="52-week range" value={r.range52w ? `${r.range52w.positionPct.toFixed(0)}% of range` : "—"} hint={r.range52w ? `${cur}${r.range52w.low.toFixed(2)} – ${cur}${r.range52w.high.toFixed(2)}` : undefined} />
      </div>
      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-lg border border-border/70 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Next earnings</p>
          <p className="mt-0.5 text-foreground">
            {r.nextEarnings ? `${r.nextEarnings.date}${r.nextEarnings.isEstimate ? " (estimated)" : ""}` : r.market === "IN" ? "Not on file" : "Not shown for US names here"}
          </p>
        </div>
        <div className="rounded-lg border border-border/70 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Recent insider filings</p>
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
      <p className="text-xs text-muted-foreground">{r.method} As of {r.asOf}. Not a rating or recommendation.</p>
    </div>
  );
}
