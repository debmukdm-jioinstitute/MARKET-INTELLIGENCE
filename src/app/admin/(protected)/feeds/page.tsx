"use client";

import { AdminCard } from "@/components/admin/admin-card";
import { useEffect, useState } from "react";

type Series = { id: string; label: string; category: string; provider: string; latest_date: string | null; last_ok: string | null; last_error: string | null; points: number; status: "fresh" | "stale" | "failing" | "pending" };
type Data = {
  counts: Record<string, number>;
  series: Series[];
  failures: { collector: string; error: string | null; at: string | null }[];
  datagov: { dataset_id: string | null; kind: string; ok: boolean; rows: number; error: string | null; ran_at: string }[];
  scanner: { id: string; run_at: string }[];
  research: { source: string; ok: boolean; items_found: number; error: string | null; ran_at: string }[];
  prowess: { stored: number; failed: number };
  prowessErrors: { symbol: string; report: string; error: string; failed_at: string }[];
  keys: { key: string; set: boolean }[];
};

const badge: Record<string, string> = { fresh: "bg-green-100 text-green-800", stale: "bg-amber-100 text-amber-800", failing: "bg-red-100 text-red-800", pending: "bg-gray-200 text-gray-700" };
const when = (d: string | null) => (d ? new Date(d).toLocaleString() : "never");

export default function AdminFeedsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "fresh" | "stale" | "failing" | "pending">("all");

  useEffect(() => {
    fetch("/api/admin/feeds")
      .then((r) => r.json())
      .then((j) => (j.error ? setError(j.error) : setData(j)))
      .catch(() => setError("Failed to load"));
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-sm text-gray-500">Loading…</p>;
  const series = data.series.filter((s) => filter === "all" || s.status === filter);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-blue-600">Data feeds</p>
        <h1 className="text-2xl font-semibold text-gray-900">Feed health</h1>
        <p className="text-sm text-gray-500">Re-run any collector from System & Jobs.</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-4">
        {(["fresh", "stale", "failing", "pending"] as const).map((k) => (
          <button key={k} onClick={() => setFilter(filter === k ? "all" : k)} className={`rounded-md border p-3 text-left ${filter === k ? "border-blue-500" : "border-gray-200"} bg-white`}>
            <p className="text-xs uppercase text-gray-500">{k}</p>
            <p className="text-2xl font-semibold text-gray-900">{data.counts[k] ?? 0}</p>
          </button>
        ))}
      </div>

      {data.failures.length > 0 ? (
        <AdminCard title="Collector failures">
          <ul className="space-y-1 text-sm text-red-700">
            {data.failures.map((f) => <li key={f.collector}>{f.collector}: {f.error} <span className="text-gray-500">({when(f.at)})</span></li>)}
          </ul>
        </AdminCard>
      ) : null}

      <AdminCard title={`Series (${series.length})`}>
        <div className="max-h-96 overflow-auto divide-y divide-gray-200">
          {series.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 py-1.5 text-sm">
              <div className="min-w-0">
                <p className="truncate text-gray-900">{s.label} <span className="text-gray-500">· {s.id}</span></p>
                <p className="truncate text-gray-500">{s.provider} · latest {s.latest_date ? String(s.latest_date).slice(0, 10) : "—"} · {s.points} pts{s.last_error ? ` · ${s.last_error}` : ""}</p>
              </div>
              <span className={`shrink-0 rounded px-2 py-0.5 text-xs ${badge[s.status]}`}>{s.status}</span>
            </div>
          ))}
        </div>
      </AdminCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminCard title="data.gov.in sync">
          <ul className="space-y-1 text-sm">
            {data.datagov.map((d, i) => <li key={i} className={d.ok ? "text-gray-900" : "text-red-600"}>{d.kind} {d.dataset_id ?? ""} · {d.rows} rows{d.error ? ` · ${d.error}` : ""} <span className="text-gray-500">({when(d.ran_at)})</span></li>)}
            {data.datagov.length === 0 ? <li className="text-gray-500">No syncs logged.</li> : null}
          </ul>
        </AdminCard>
        <AdminCard title="Research scrapes">
          <ul className="space-y-1 text-sm">
            {data.research.map((d, i) => <li key={i} className={d.ok ? "text-gray-900" : "text-red-600"}>{d.source} · {d.items_found} items{d.error ? ` · ${d.error}` : ""} <span className="text-gray-500">({when(d.ran_at)})</span></li>)}
            {data.research.length === 0 ? <li className="text-gray-500">No scrapes logged.</li> : null}
          </ul>
        </AdminCard>
        <AdminCard title="Scanner" subtitle="Last run per scanner">
          <ul className="space-y-1 text-sm text-gray-900">
            {data.scanner.map((s) => <li key={s.id}>{s.id} <span className="text-gray-500">({when(s.run_at)})</span></li>)}
            {data.scanner.length === 0 ? <li className="text-gray-500">No scans stored.</li> : null}
          </ul>
        </AdminCard>
        <AdminCard title="CMIE Prowess" subtitle={`${data.prowess.stored} reports stored · ${data.prowess.failed} failed`}>
          <ul className="space-y-1 text-sm text-red-700">
            {data.prowessErrors.map((e, i) => <li key={i}>{e.symbol}/{e.report}: {e.error}</li>)}
            {data.prowessErrors.length === 0 ? <li className="text-gray-500">No errors.</li> : null}
          </ul>
        </AdminCard>
      </div>

      <AdminCard title="Upstream credentials" subtitle="Presence only.">
        <div className="grid gap-1 sm:grid-cols-2">
          {data.keys.map((k) => (
            <div key={k.key} className="flex justify-between text-sm">
              <span className="text-gray-900">{k.key}</span>
              <span className={k.set ? "text-green-700" : "text-gray-400"}>{k.set ? "set" : "missing"}</span>
            </div>
          ))}
        </div>
      </AdminCard>
    </div>
  );
}
