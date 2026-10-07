"use client";

import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { signClass } from "@/lib/sign-color";

type BrokerAccuracy = {
  broker: string;
  sampleSize: number;
  scored: number;
  hitRatePct: number | null;
  avgReturnPct: number | null;
  buyCount: number;
  sellCount: number;
  holdCount: number;
  topBasis: string | null;
  typicalHorizon: string | null;
};

type RecoRow = {
  id: string;
  broker: string | null;
  title: string;
  url: string;
  rating: string;
  symbol: string | null;
  targetPrice: number | null;
  horizon: string;
  basis: string | null;
  returnPct: number | null;
  hit: boolean | null;
  outcomeLabel: string | null;
  published_at: string | null;
};

export function AnalystCredibilityPanel() {
  const [brokers, setBrokers] = useState<BrokerAccuracy[]>([]);
  const [recos, setRecos] = useState<RecoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/research-reports/credibility?limit=100")
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
        if (cancelled) return;
        setBrokers(json.brokers ?? []);
        setRecos(json.recommendations ?? []);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load credibility");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="space-y-3 rounded-xl border border-border/90 bg-card p-4">
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
          Broker credibility · last 100 calls
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Parsed rating, basis, and time horizon from public headlines, then scored against subsequent price
          moves. Use this to judge track records — not as a blind signal to follow.
        </p>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Scoring recommendations…</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {!loading && !error && brokers.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border text-sm uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3 font-semibold">Broker / house</th>
                <th className="py-2 pr-3 font-semibold">Hit rate</th>
                <th className="py-2 pr-3 font-semibold">Avg return</th>
                <th className="py-2 pr-3 font-semibold">Sample</th>
                <th className="py-2 pr-3 font-semibold">Mix</th>
                <th className="py-2 pr-3 font-semibold">Typical basis</th>
                <th className="py-2 font-semibold">Horizon</th>
              </tr>
            </thead>
            <tbody>
              {brokers.map((b) => (
                <tr key={b.broker} className="border-b border-border/60 align-top">
                  <td className="py-2.5 pr-3 font-semibold text-foreground">{b.broker}</td>
                  <td className="py-2.5 pr-3 tabular-nums">
                    {b.hitRatePct != null ? (
                      <span className={cn(b.hitRatePct >= 55 ? "text-emerald-700" : b.hitRatePct < 45 ? "text-rose-700" : "")}>
                        {b.hitRatePct}%
                      </span>
                    ) : (
                      <span className="text-muted-foreground">n/a</span>
                    )}
                    <span className="ml-1 text-sm text-muted-foreground">({b.scored} scored)</span>
                  </td>
                  <td className={cn("py-2.5 pr-3 tabular-nums", signClass(b.avgReturnPct))}>
                    {b.avgReturnPct != null ? `${b.avgReturnPct >= 0 ? "+" : ""}${b.avgReturnPct}%` : "—"}
                  </td>
                  <td className="py-2.5 pr-3 tabular-nums">{b.sampleSize}</td>
                  <td className="py-2.5 pr-3 text-sm text-muted-foreground">
                    B{b.buyCount} / S{b.sellCount} / H{b.holdCount}
                  </td>
                  <td className="py-2.5 pr-3 text-sm text-muted-foreground">{b.topBasis ?? "—"}</td>
                  <td className="py-2.5 text-sm text-muted-foreground">{b.typicalHorizon ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!loading && !error && recos.length > 0 ? (
        <div className="overflow-x-auto">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Recommendation detail (basis &amp; horizon)
          </p>
          <table className="w-full min-w-[860px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border text-sm uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3 font-semibold">Broker</th>
                <th className="py-2 pr-3 font-semibold">Call</th>
                <th className="py-2 pr-3 font-semibold">Symbol</th>
                <th className="py-2 pr-3 font-semibold">Target</th>
                <th className="py-2 pr-3 font-semibold">Basis</th>
                <th className="py-2 pr-3 font-semibold">Horizon</th>
                <th className="py-2 font-semibold">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {recos.slice(0, 100).map((r) => (
                <tr key={r.id} className="border-b border-border/60 align-top">
                  <td className="py-2 pr-3 text-sm font-semibold">{r.broker ?? "—"}</td>
                  <td className="py-2 pr-3">
                    <span className="mr-1 rounded bg-accent/50 px-1.5 py-0.5 text-sm font-bold uppercase">
                      {r.rating}
                    </span>
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      {r.title.length > 72 ? `${r.title.slice(0, 72)}…` : r.title}
                      <ExternalLink className="ml-1 inline size-3" />
                    </a>
                  </td>
                  <td className="py-2 pr-3 tabular-nums text-sm">{r.symbol ?? "—"}</td>
                  <td className="py-2 pr-3 tabular-nums text-sm">
                    {r.targetPrice != null ? `₹${r.targetPrice.toLocaleString("en-IN")}` : "—"}
                  </td>
                  <td className="py-2 pr-3 text-sm text-muted-foreground">{r.basis ?? "—"}</td>
                  <td className="py-2 pr-3 text-sm text-muted-foreground">{r.horizon}</td>
                  <td
                    className={cn(
                      "py-2 text-sm",
                      r.hit === true ? "text-emerald-700" : r.hit === false ? "text-rose-700" : "text-muted-foreground",
                    )}
                  >
                    {r.outcomeLabel ?? "Pending / unscored"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!loading && !error && brokers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No scored recommendations yet — the research feed needs ingested headlines first.
        </p>
      ) : null}
    </section>
  );
}
