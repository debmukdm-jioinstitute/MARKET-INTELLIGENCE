"use client";

import { AnalyticsMetricInfo } from "@/components/admin/analytics-metric-info";
import { ANALYTICS_SECTIONS, type AnalyticsDashboardPayload } from "@/lib/admin/analytics-catalog";
import { AdminCard, AdminStat } from "@/components/admin/admin-card";
import { useEffect, useMemo, useState } from "react";

function formatMetric(value: number | string | null | undefined, format?: string): string {
  if (value == null || value === "") return "—";
  if (typeof value === "string") return value;
  if (format === "percent") return `${value}%`;
  if (format === "currency") return value === 0 ? "₹0" : `₹${value.toLocaleString("en-IN")}`;
  if (format === "duration") {
    if (value < 60) return `${Math.round(value)}s`;
    const m = Math.floor(value / 60);
    const s = Math.round(value % 60);
    return `${m}m ${s}s`;
  }
  if (format === "ratio") return value.toFixed(2);
  return value.toLocaleString("en-IN");
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  const maxDaily = Math.max(1, ...(data?.daily.map((d) => d.n) ?? [1]));

  const sectionNav = useMemo(() => ANALYTICS_SECTIONS.map((s) => ({ id: s.id, title: s.title })), []);

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-blue-600">Analytics</p>
          <h1 className="mt-1 text-xl font-semibold">Product metrics</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Live from Postgres — pageviews, sessions, users, retention, product events. Metrics without data show — until
            instrumented.
          </p>
          {data?.generatedAt ? (
            <p className="mt-1 text-xs text-gray-400">
              Updated {new Date(data.generatedAt).toLocaleString("en-IN")}{loading ? " · refreshing…" : ""}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={load}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      <nav className="flex flex-wrap gap-2">
        {sectionNav.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 hover:border-blue-300 hover:text-blue-700"
          >
            {s.title}
          </a>
        ))}
      </nav>

      {ANALYTICS_SECTIONS.map((section) => (
        <section key={section.id} id={section.id} className="scroll-mt-6 space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-800">{section.title}</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {section.metrics.map((m) => {
              const raw = data?.metrics[m.key];
              const formatted = formatMetric(raw, m.format);
              const extraHint = m.hint ?? data?.metricHints[m.key];
              return (
                <div key={m.key} className="relative">
                  <AdminStat
                    label={m.label}
                    value={formatted}
                    info={
                      <AnalyticsMetricInfo
                        metricKey={m.key}
                        label={m.label}
                        formattedValue={formatted}
                        rawValue={raw}
                        extraHint={extraHint}
                      />
                    }
                  />
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminCard title="Daily pageviews (14 days)">
          <div className="flex h-40 items-end gap-1">
            {(data?.daily ?? []).map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-blue-600/70"
                  style={{ height: `${Math.max(4, (d.n / maxDaily) * 140)}px` }}
                  title={`${d.day}: ${d.n}`}
                />
                <span className="text-sm text-gray-500">{d.day.slice(5)}</span>
              </div>
            ))}
            {data && data.daily.length === 0 ? <p className="text-sm text-gray-500">No traffic recorded yet.</p> : null}
          </div>
        </AdminCard>

        <AdminCard title="Traffic mix (30 days)">
          <div className="space-y-1">
            {(data?.trafficMix ?? []).map((t) => (
              <div key={t.source} className="flex items-center justify-between border-b border-gray-100 py-1.5 text-sm">
                <span className="text-gray-700">{t.source}</span>
                <span className="tabular-nums text-gray-500">{t.n.toLocaleString("en-IN")}</span>
              </div>
            ))}
            {data && data.trafficMix.length === 0 ? (
              <p className="text-sm text-gray-500">No referrer data yet.</p>
            ) : null}
          </div>
        </AdminCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminCard title="Top pages (7 days)">
          <div className="space-y-1">
            {(data?.topPaths ?? []).map((p) => (
              <div key={p.path} className="flex items-center justify-between border-b border-gray-100 py-1.5 text-sm">
                <span className="truncate text-gray-700">{p.path}</span>
                <span className="tabular-nums text-gray-500">{p.n}</span>
              </div>
            ))}
          </div>
        </AdminCard>

        <AdminCard title="Feature events (30 days)">
          <div className="space-y-1">
            {(data?.topFeatures ?? []).map((f) => (
              <div key={f.name} className="flex items-center justify-between border-b border-gray-100 py-1.5 text-sm">
                <span className="text-gray-700">{f.name}</span>
                <span className="tabular-nums text-gray-500">{f.n}</span>
              </div>
            ))}
            {data && data.topFeatures.length === 0 ? (
              <p className="text-sm text-gray-500">No non-pageview events yet (AI queries will appear here).</p>
            ) : null}
          </div>
        </AdminCard>
      </div>
    </div>
  );
}
