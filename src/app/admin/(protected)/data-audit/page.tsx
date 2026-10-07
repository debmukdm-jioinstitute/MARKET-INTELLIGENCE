"use client";

import { AdminCard } from "@/components/admin/admin-card";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Series = {
  id: string;
  label: string;
  unit: string;
  category: string;
  provider: string;
  url: string;
  last_ok: string | null;
  last_error: string | null;
  last_run: string | null;
  latest_date: string | null;
  obs_count: number;
  status: "fresh" | "stale" | "failing" | "pending";
  maxAgeDays: number;
  view: string;
};
type CronRun = {
  id: string;
  job_name: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  rows_written: number;
  error: string | null;
  trigger: string;
  duration_s: number | null;
  view: string | null;
};
type LogRow = Record<string, string | number | boolean | null>;
type Data = {
  generatedAt: string;
  series: Series[];
  datagovLog: LogRow[];
  data360Log: LogRow[];
  scrapeLog: LogRow[];
  scanLatest: LogRow[];
  cronRuns: CronRun[];
  tableCounts: Record<string, number | null>;
  workflows: { name: string; schedule: string; what: string; via: string }[];
  note: string;
};

const badge: Record<string, string> = {
  fresh: "bg-green-100 text-green-800",
  stale: "bg-amber-100 text-amber-800",
  failing: "bg-red-100 text-red-800",
  pending: "bg-gray-200 text-gray-700",
  success: "bg-green-100 text-green-800",
  error: "bg-red-100 text-red-800",
  running: "bg-blue-100 text-blue-800",
};

function rel(iso: string | null): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return "just now";
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "1d ago" : `${d}d ago`;
}

function ist(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dur(s: number | null): string {
  if (s == null) return "—";
  if (s < 60) return `${Math.round(s)}s`;
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

type SortKey = "id" | "status" | "last_ok" | "obs_count";

export default function AdminDataAuditPage() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "fresh" | "stale" | "failing" | "pending">("all");
  const [sortKey, setSortKey] = useState<SortKey>("status");
  const [sortDir, setSortDir] = useState<1 | -1>(1);

  useEffect(() => {
    fetch("/api/admin/data-audit", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => (j.error ? setError(j.error) : setData(j)))
      .catch(() => setError("Failed to load data audit"));
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { fresh: 0, stale: 0, failing: 0, pending: 0 };
    for (const s of data?.series ?? []) c[s.status] = (c[s.status] ?? 0) + 1;
    return c;
  }, [data]);

  const series = useMemo(() => {
    const list = (data?.series ?? []).filter((s) => filter === "all" || s.status === filter);
    const rank: Record<string, number> = { failing: 0, stale: 1, pending: 2, fresh: 3 };
    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "status") cmp = rank[a.status] - rank[b.status];
      else if (sortKey === "last_ok") cmp = (a.last_ok ? new Date(a.last_ok).getTime() : 0) - (b.last_ok ? new Date(b.last_ok).getTime() : 0);
      else if (sortKey === "obs_count") cmp = a.obs_count - b.obs_count;
      else cmp = a.id.localeCompare(b.id);
      return cmp * sortDir;
    });
  }, [data, filter, sortKey, sortDir]);

  const lastCollect = useMemo(
    () => (data?.cronRuns ?? []).find((r) => r.job_name === "collect" && r.status === "success"),
    [data],
  );
  const oldestStale = useMemo(() => {
    const stal = (data?.series ?? []).filter((s) => s.status === "stale" || s.status === "failing");
    stal.sort((a, b) => (a.last_ok ? new Date(a.last_ok).getTime() : 0) - (b.last_ok ? new Date(b.last_ok).getTime() : 0));
    return stal[0] ?? null;
  }, [data]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-sm text-gray-500">Loading mission control…</p>;

  const th = (label: string, key: SortKey) => (
    <th
      className="cursor-pointer px-3 py-2 text-left font-medium text-gray-500 select-none"
      onClick={() => (sortKey === key ? setSortDir(sortDir === 1 ? -1 : 1) : (setSortKey(key), setSortDir(1)))}
    >
      {label}
      {sortKey === key ? (sortDir === 1 ? " ▲" : " ▼") : ""}
    </th>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Data Audit — Mission Control</h1>
          <p className="text-sm text-gray-500">
            Every source, every cron, every table. Generated {ist(data.generatedAt)} IST.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {/* (a) status strip */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
        {([
          ["fresh", counts.fresh, "Sources fresh"],
          ["stale", counts.stale, "Sources stale"],
          ["failing", counts.failing, "Sources failing"],
          ["pending", counts.pending, "Sources pending"],
        ] as const).map(([k, v, label]) => (
          <button
            key={k}
            onClick={() => setFilter(filter === k ? "all" : k)}
            className={`rounded-md border bg-white p-3 text-left ${filter === k ? "border-blue-500" : "border-gray-200"}`}
          >
            <p className="text-xs uppercase text-gray-500">{label}</p>
            <p className="text-2xl font-semibold text-gray-900">{v}</p>
          </button>
        ))}
        <div className="rounded-md border border-gray-200 bg-white p-3">
          <p className="text-xs uppercase text-gray-500">Last collect run</p>
          <p className="text-lg font-semibold text-gray-900">{lastCollect ? rel(lastCollect.started_at) : "never"}</p>
          <p className="text-xs text-gray-500">{lastCollect ? ist(lastCollect.started_at) : ""}</p>
        </div>
        <div className="rounded-md border border-gray-200 bg-white p-3">
          <p className="text-xs uppercase text-gray-500">Oldest stale source</p>
          <p className="truncate text-lg font-semibold text-gray-900" title={oldestStale?.id}>{oldestStale ? oldestStale.id : "none"}</p>
          <p className="text-xs text-gray-500">{oldestStale ? rel(oldestStale.last_ok) : ""}</p>
        </div>
      </div>

      {/* (b) per-source audit table */}
      <AdminCard title={`Sources (${series.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase">
                {th("Source", "id")}
                <th className="px-3 py-2 text-left font-medium text-gray-500">Provider</th>
                {th("Status", "status")}
                {th("Last OK", "last_ok")}
                <th className="px-3 py-2 text-left font-medium text-gray-500">Last error</th>
                {th("Rows", "obs_count")}
                <th className="px-3 py-2 text-left font-medium text-gray-500">Cadence</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {series.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <p className="font-medium text-gray-900">{s.label}</p>
                    <p className="text-xs text-gray-500">{s.id} · {s.category}</p>
                  </td>
                  <td className="px-3 py-2 text-gray-700">{s.provider}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-2 py-0.5 text-xs ${badge[s.status]}`}>{s.status}</span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-700" title={s.last_ok ? new Date(s.last_ok).toISOString() : ""}>
                    {rel(s.last_ok)} <span className="text-xs text-gray-400">({ist(s.last_ok)})</span>
                  </td>
                  <td className="max-w-xs truncate px-3 py-2 text-xs text-red-600" title={s.last_error ?? ""}>
                    {s.last_error ?? "—"}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-gray-700">{s.obs_count.toLocaleString("en-IN")}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">≤ {s.maxAgeDays}d</td>
                  <td className="px-3 py-2">
                    <Link href={s.view} className="text-blue-600 hover:underline">View →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {series.length === 0 ? <p className="p-4 text-sm text-gray-500">No sources match this filter.</p> : null}
        </div>
      </AdminCard>

      {/* (c) cron run journal */}
      <AdminCard title={`Cron run journal (last ${data.cronRuns.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
                <th className="px-3 py-2 text-left font-medium">Job</th>
                <th className="px-3 py-2 text-left font-medium">Started (IST)</th>
                <th className="px-3 py-2 text-left font-medium">Duration</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-left font-medium">Rows</th>
                <th className="px-3 py-2 text-left font-medium">Trigger</th>
                <th className="px-3 py-2 text-left font-medium">Error</th>
                <th className="px-3 py-2 text-left font-medium">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.cronRuns.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-900">{r.job_name}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-700">{ist(r.started_at)}</td>
                  <td className="px-3 py-2 text-gray-700">{dur(r.duration_s)}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-2 py-0.5 text-xs ${badge[r.status] ?? "bg-gray-200 text-gray-700"}`}>{r.status}</span>
                  </td>
                  <td className="px-3 py-2 tabular-nums text-gray-700">{r.rows_written}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{r.trigger}</td>
                  <td className="max-w-xs truncate px-3 py-2 text-xs text-red-600" title={r.error ?? ""}>{r.error ?? "—"}</td>
                  <td className="px-3 py-2">{r.view ? <Link href={r.view} className="text-blue-600 hover:underline">View →</Link> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.cronRuns.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">No runs journaled yet — the next scheduled cron will appear here.</p>
          ) : null}
        </div>
      </AdminCard>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* sync logs */}
        <AdminCard title="Sync logs">
          <div className="space-y-4 text-sm">
            <div>
              <p className="mb-1 text-xs uppercase text-gray-500">data.gov.in</p>
              <ul className="space-y-1">
                {data.datagovLog.map((d, i) => (
                  <li key={i} className={d.ok ? "text-gray-900" : "text-red-600"}>
                    {String(d.kind)} · {Number(d.rows)} rows{d.error ? ` · ${String(d.error).slice(0, 120)}` : ""}{" "}
                    <span className="text-gray-500">({rel(String(d.ran_at))})</span>
                  </li>
                ))}
                {data.datagovLog.length === 0 ? <li className="text-gray-500">No syncs logged.</li> : null}
              </ul>
            </div>
            <div>
              <p className="mb-1 text-xs uppercase text-gray-500">World Bank Data360</p>
              <ul className="space-y-1">
                {data.data360Log.map((d, i) => (
                  <li key={i} className={d.ok ? "text-gray-900" : "text-red-600"}>
                    {String(d.kind)} · {Number(d.rows)} rows{d.error ? ` · ${String(d.error).slice(0, 120)}` : ""}{" "}
                    <span className="text-gray-500">({rel(String(d.ran_at))})</span>
                  </li>
                ))}
                {data.data360Log.length === 0 ? <li className="text-gray-500">No syncs logged.</li> : null}
              </ul>
            </div>
            <div>
              <p className="mb-1 text-xs uppercase text-gray-500">Research scrape</p>
              <ul className="space-y-1">
                {data.scrapeLog.map((d, i) => (
                  <li key={i} className={d.ok ? "text-gray-900" : "text-red-600"}>
                    {String(d.source)} · {Number(d.items_found)} items{d.error ? ` · ${String(d.error).slice(0, 120)}` : ""}{" "}
                    <span className="text-gray-500">({rel(String(d.ran_at))})</span>
                  </li>
                ))}
                {data.scrapeLog.length === 0 ? <li className="text-gray-500">No scrapes logged.</li> : null}
              </ul>
            </div>
            <div>
              <p className="mb-1 text-xs uppercase text-gray-500">Scanner latest</p>
              <ul className="space-y-1">
                {data.scanLatest.map((d, i) => (
                  <li key={i} className="text-gray-900">
                    {String(d.id)} · {d.scanned != null ? `${Number(d.scanned)} scanned` : ""}{" "}
                    <span className="text-gray-500">({rel(String(d.run_at))})</span>
                  </li>
                ))}
                {data.scanLatest.length === 0 ? <li className="text-gray-500">No scans saved.</li> : null}
              </ul>
            </div>
          </div>
        </AdminCard>

        {/* table row counts */}
        <AdminCard title="Table row counts">
          <div className="grid grid-cols-2 gap-x-4 text-sm">
            {Object.entries(data.tableCounts).map(([t, c]) => (
              <div key={t} className="flex items-center justify-between border-b border-gray-100 py-1">
                <span className="truncate text-gray-700">{t}</span>
                <span className="tabular-nums text-gray-900">{c == null ? "—" : c.toLocaleString("en-IN")}</span>
              </div>
            ))}
          </div>
        </AdminCard>
      </div>

      {/* (d) workflow schedule reference */}
      <AdminCard title="Workflow schedules (UTC)">
        <p className="mb-3 text-xs text-gray-500">{data.note}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
                <th className="px-3 py-2 text-left font-medium">Workflow</th>
                <th className="px-3 py-2 text-left font-medium">Schedule (UTC)</th>
                <th className="px-3 py-2 text-left font-medium">What</th>
                <th className="px-3 py-2 text-left font-medium">Via</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.workflows.map((w) => (
                <tr key={w.name} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-xs text-gray-900">{w.name}</td>
                  <td className="px-3 py-2 text-xs text-gray-700">{w.schedule}</td>
                  <td className="px-3 py-2 text-gray-700">{w.what}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{w.via}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </div>
  );
}
