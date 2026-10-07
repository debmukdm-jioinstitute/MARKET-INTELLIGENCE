"use client";

import { AdminCard, AdminStat } from "@/components/admin/admin-card";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type Payload = {
  health: {
    score: number;
    grade: string;
    components: Record<string, { score: number; detail: string; available: boolean }>;
    computed_at: string;
  };
  anomalies: Array<{
    metric: string;
    date: string;
    value: number;
    expected: number;
    z: number;
    severity: "high" | "medium";
    method: string;
  }>;
  stalenessForecast: Array<{
    series_id: string;
    label: string;
    hours_since_ok: number | null;
    typical_interval_hours: number | null;
    stale_in_hours: number;
    confidence: "high" | "medium" | "low";
    method: string;
  }>;
  collectorReliability: Array<{
    series_id: string;
    label: string;
    fail_streak: number;
    success_rate_30d: number | null;
    predicted_failure_risk: "low" | "medium" | "high";
    method: string;
  }>;
  xpLiability: {
    total_outstanding_xp: number;
    users_with_xp: number;
    near_redemption_count: number;
    free_months_liability: number;
    earn_velocity_xp_per_day: number;
    projected_free_months_per_month: number;
  };
  brief: { text: string; generated_at: string; source: "hf" | "template" };
  generated_at: string;
};

const COMPONENT_LABELS: Record<string, string> = {
  freshness: "Data freshness",
  cron: "Cron reliability",
  growth: "User growth",
  engagement: "Engagement",
};

function RiskBadge({ risk }: { risk: "low" | "medium" | "high" }) {
  const cls =
    risk === "high"
      ? "bg-gray-900 text-white"
      : risk === "medium"
        ? "bg-gray-300 text-gray-900"
        : "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{risk}</span>
  );
}

function SeverityBadge({ s }: { s: "high" | "medium" }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
        s === "high" ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-800"
      }`}
    >
      {s}
    </span>
  );
}

function fmtHours(h: number): string {
  if (h < 0) return `${Math.abs(Math.round(h))}h overdue`;
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 48) return `${Math.round(h)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

export default function AdminIntelligencePage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshingBrief, setRefreshingBrief] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (refreshBrief = false) => {
    if (refreshBrief) setRefreshingBrief(true);
    else setLoading(true);
    try {
      const r = await fetch(`/api/admin/intelligence${refreshBrief ? "?refresh=1" : ""}`, {
        cache: "no-store",
      });
      if (r.ok) setData(await r.json());
    } catch {
      /* keep stale data */
    } finally {
      setLoading(false);
      setRefreshingBrief(false);
    }
  }, []);

  useEffect(() => {
    load();
    timer.current = setInterval(() => load(), 5 * 60 * 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [load]);

  const h = data?.health;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Mission control</p>
          <h1 className="mt-1 text-xl font-semibold">AI Insights</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Statistical website intelligence — z-score anomalies, staleness forecasts, heuristic failure
            risk, XP liability. Methods are labeled on each panel; nothing here is a black box.
          </p>
          {data?.generated_at ? (
            <p className="mt-1 text-xs text-gray-400">
              Updated {new Date(data.generated_at).toLocaleString("en-IN")}
              {loading ? " · refreshing…" : ""}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => load()}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-100"
        >
          Refresh now
        </button>
      </div>

      {/* (a) Health score hero */}
      <AdminCard title="Website health score" subtitle="Weighted composite: freshness 30 · cron 30 · growth 20 · engagement 20">
        {h ? (
          <div className="flex flex-wrap items-center gap-8">
            <div className="flex items-center gap-4">
              <div className="text-5xl font-bold tabular-nums text-gray-900">{h.score}</div>
              <div>
                <div className="text-lg font-semibold text-gray-900">Grade {h.grade}</div>
                <div className="text-xs text-gray-500">0–100 · higher is healthier</div>
              </div>
            </div>
            <div className="min-w-64 flex-1 space-y-2">
              {Object.entries(COMPONENT_LABELS).map(([key, label]) => {
                const c = h.components[key];
                if (!c) return null;
                return (
                  <div key={key} title={c.detail}>
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>
                        {label}
                        {!c.available ? <span className="text-gray-400"> · no data</span> : null}
                      </span>
                      <span className="tabular-nums">{c.score}</span>
                    </div>
                    <div className="mt-0.5 h-1.5 rounded-full bg-gray-200">
                      <div
                        className="h-1.5 rounded-full bg-gray-800"
                        style={{ width: `${Math.max(0, Math.min(100, c.score))}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-gray-400">{c.detail}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">{loading ? "Computing…" : "No data."}</p>
        )}
      </AdminCard>

      {/* (b) Ops brief */}
      <AdminCard
        title="Ops brief"
        subtitle={`Plain-English summary · source: ${data?.brief.source === "hf" ? "Hugging Face bart-large-cnn (abstractive)" : "template fallback"}`}
        action={
          <button
            type="button"
            onClick={() => load(true)}
            disabled={refreshingBrief}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-100 disabled:opacity-50"
          >
            {refreshingBrief ? "Regenerating…" : "Regenerate"}
          </button>
        }
      >
        {data?.brief ? (
          <div>
            <div className="space-y-1.5 text-sm text-gray-800">
              {data.brief.text.split("\n").map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-400">
              Generated {new Date(data.brief.generated_at).toLocaleString("en-IN")} · cached 6h
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-500">{loading ? "Generating…" : "No brief."}</p>
        )}
      </AdminCard>

      {/* (c) Anomalies */}
      <AdminCard
        title="Anomaly radar"
        subtitle="z-score anomalies (|z| > 2.5, ≥14 days history) + collector fail-streak rules"
      >
        {data?.anomalies?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                  <th className="py-2 pr-3 font-medium">Metric</th>
                  <th className="py-2 pr-3 font-medium">Date</th>
                  <th className="py-2 pr-3 font-medium">Value</th>
                  <th className="py-2 pr-3 font-medium">Expected</th>
                  <th className="py-2 pr-3 font-medium">z</th>
                  <th className="py-2 pr-3 font-medium">Severity</th>
                  <th className="py-2 font-medium">Method</th>
                </tr>
              </thead>
              <tbody>
                {data.anomalies.map((a, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-2 pr-3 font-medium text-gray-900">{a.metric}</td>
                    <td className="py-2 pr-3 text-gray-600">{a.date}</td>
                    <td className="py-2 pr-3 tabular-nums">{a.value.toLocaleString("en-IN")}</td>
                    <td className="py-2 pr-3 tabular-nums text-gray-500">{a.expected.toLocaleString("en-IN")}</td>
                    <td className="py-2 pr-3 tabular-nums">{a.z > 0 ? "+" : ""}{a.z}</td>
                    <td className="py-2 pr-3"><SeverityBadge s={a.severity} /></td>
                    <td className="py-2 text-xs text-gray-400">{a.method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            {loading ? "Scanning…" : "No anomalies detected — all metrics within normal bands."}
          </p>
        )}
      </AdminCard>

      {/* (d) Staleness forecast */}
      <AdminCard
        title="Staleness forecast"
        subtitle="Predicted time until each series crosses the 48h freshness line, from last_ok + typical collection interval"
        action={
          <Link href="/admin/data-audit" className="text-sm font-medium text-gray-800 underline underline-offset-4">
            Open data audit →
          </Link>
        }
      >
        {data?.stalenessForecast?.length ? (
          <ul className="divide-y divide-gray-100">
            {data.stalenessForecast.slice(0, 12).map((s) => (
              <li key={s.series_id} className="flex items-center justify-between gap-3 py-2">
                <div>
                  <Link
                    href="/admin/data-audit"
                    className="text-sm font-medium text-gray-900 hover:underline"
                    title={s.method}
                  >
                    {s.label}
                  </Link>
                  <p className="text-xs text-gray-400">
                    {s.hours_since_ok == null
                      ? "never collected"
                      : `last ok ${fmtHours(s.hours_since_ok)} ago`}
                    {s.typical_interval_hours != null ? ` · typical cadence ${fmtHours(s.typical_interval_hours)}` : ""}
                    {" · "}{s.confidence} confidence
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${
                    s.stale_in_hours < 0 ? "bg-gray-900 text-white" : s.stale_in_hours < 12 ? "bg-gray-300 text-gray-900" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {s.stale_in_hours < 0 ? `stale ${fmtHours(s.stale_in_hours)}` : `stale in ${fmtHours(s.stale_in_hours)}`}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">
            {loading ? "Forecasting…" : "Nothing forecast to go stale in the next 72 hours."}
          </p>
        )}
      </AdminCard>

      {/* (e) Collector reliability */}
      <AdminCard
        title="Collector reliability"
        subtitle="Heuristic failure risk from fail streaks + 30-day cron success rates"
      >
        {data?.collectorReliability?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                  <th className="py-2 pr-3 font-medium">Collector</th>
                  <th className="py-2 pr-3 font-medium">Fail streak</th>
                  <th className="py-2 pr-3 font-medium">30d success</th>
                  <th className="py-2 font-medium">Predicted risk</th>
                </tr>
              </thead>
              <tbody>
                {data.collectorReliability.map((c) => (
                  <tr key={c.series_id} className="border-b border-gray-100" title={c.method}>
                    <td className="py-2 pr-3 font-medium text-gray-900">{c.label}</td>
                    <td className="py-2 pr-3 tabular-nums">{c.fail_streak}</td>
                    <td className="py-2 pr-3 tabular-nums text-gray-600">
                      {c.success_rate_30d == null ? "—" : `${Math.round(c.success_rate_30d * 100)}%`}
                    </td>
                    <td className="py-2"><RiskBadge risk={c.predicted_failure_risk} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">{loading ? "Loading…" : "No collectors registered."}</p>
        )}
      </AdminCard>

      {/* (f) XP liability */}
      <AdminCard title="XP liability" subtitle="Outstanding XP economics from the xp_events ledger">
        {data?.xpLiability ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <AdminStat label="Outstanding XP" value={data.xpLiability.total_outstanding_xp.toLocaleString("en-IN")} />
            <AdminStat label="Users holding XP" value={data.xpLiability.users_with_xp.toLocaleString("en-IN")} />
            <AdminStat label="Near redemption (250–299 XP)" value={data.xpLiability.near_redemption_count.toLocaleString("en-IN")} />
            <AdminStat label="Free months redeemable now" value={data.xpLiability.free_months_liability.toLocaleString("en-IN")} />
            <AdminStat label="Earn velocity (XP/day)" value={data.xpLiability.earn_velocity_xp_per_day.toLocaleString("en-IN")} />
            <AdminStat label="Projected free mo / month" value={data.xpLiability.projected_free_months_per_month.toLocaleString("en-IN")} />
          </div>
        ) : (
          <p className="text-sm text-gray-500">{loading ? "Computing…" : "No XP data."}</p>
        )}
      </AdminCard>
    </div>
  );
}
