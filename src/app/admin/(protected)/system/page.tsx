"use client";

import { AdminCard } from "@/components/admin/admin-card";
import { useEffect, useState } from "react";

type Data = {
  db: boolean;
  cronSecretSet: boolean;
  crons: { path: string; schedule: string; source: string; what: string }[];
  env: { key: string; required: boolean; note: string; set: boolean }[];
  flags: { flag: string; label: string; enabled: boolean }[];
  stats: Record<string, number | null>;
  scrapeLog: { source: string; ok: boolean; items_found: number; error: string | null; ran_at: string }[];
};
type RunResult = { ok: boolean; status: number; ms: number; body: string };

export default function AdminSystemPage() {
  const [data, setData] = useState<Data | null>(null);
  const [runs, setRuns] = useState<Record<string, RunResult | "running">>({});
  const [error, setError] = useState("");

  function load() {
    fetch("/api/admin/system")
      .then((r) => r.json())
      .then((j) => (j.error ? setError(j.error) : setData(j)))
      .catch(() => setError("Failed to load"));
  }
  useEffect(load, []);

  async function run(path: string) {
    setRuns((r) => ({ ...r, [path]: "running" }));
    const res = await fetch("/api/admin/system", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "run", path }) });
    const j = await res.json();
    setRuns((r) => ({ ...r, [path]: res.ok || j.status ? j : { ok: false, status: res.status, ms: 0, body: j.error ?? "failed" } }));
  }

  async function toggle(flag: string, enabled: boolean) {
    await fetch("/api/admin/system", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "flag", flag, enabled }) });
    load();
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-sm text-gray-500">Loading…</p>;

  const missing = data.env.filter((e) => e.required && !e.set);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-blue-600">System</p>
        <h1 className="text-2xl font-semibold text-gray-900">Jobs, config and feature switches</h1>
      </div>

      {missing.length > 0 || !data.db ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {!data.db ? "No database configured. " : ""}
          {missing.length > 0 ? `Missing required env: ${missing.map((m) => m.key).join(", ")}` : ""}
        </div>
      ) : null}

      <AdminCard title="Scheduled jobs" subtitle={data.cronSecretSet ? "Run any job now (uses CRON_SECRET)." : "CRON_SECRET is not set — jobs are locked in production."}>
        <div className="divide-y divide-gray-200">
          {data.crons.map((c) => {
            const r = runs[c.path];
            return (
              <div key={c.path} className="py-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-900">{c.path}</p>
                    <p className="text-sm text-gray-500">{c.what} · {c.schedule} · {c.source}</p>
                  </div>
                  <button onClick={() => run(c.path)} disabled={r === "running"} className="shrink-0 rounded-md border border-gray-300 bg-white px-3 py-1 text-sm text-gray-800 hover:bg-gray-100 disabled:opacity-50">
                    {r === "running" ? "Running…" : "Run now"}
                  </button>
                </div>
                {r && r !== "running" ? (
                  <pre className={`mt-2 max-h-40 overflow-auto rounded-md p-2 text-xs ${r.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
                    {r.status} · {r.ms}ms{"\n"}{r.body}
                  </pre>
                ) : null}
              </div>
            );
          })}
        </div>
      </AdminCard>

      <AdminCard title="Feature switches" subtitle="Kill switch for costly or risky endpoints. Takes effect immediately.">
        <div className="space-y-2">
          {data.flags.map((f) => (
            <label key={f.flag} className="flex items-center justify-between gap-3 text-sm text-gray-900">
              <span>{f.label}</span>
              <input type="checkbox" checked={f.enabled} onChange={(e) => toggle(f.flag, e.target.checked)} className="h-4 w-4" />
            </label>
          ))}
        </div>
      </AdminCard>

      <AdminCard title="Environment" subtitle="Presence only — values are never shown.">
        <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
          {data.env.map((e) => (
            <div key={e.key} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-gray-900">{e.key}{e.required ? " *" : ""}</span>
              <span className={e.set ? "text-green-700" : e.required ? "text-red-600" : "text-gray-400"}>{e.set ? "set" : "missing"}</span>
            </div>
          ))}
        </div>
      </AdminCard>

      <AdminCard title="Data footprint">
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {Object.entries(data.stats).map(([k, v]) => (
            <div key={k} className="rounded-md border border-gray-200 bg-white p-2">
              <p className="text-xs text-gray-500">{k}</p>
              <p className="text-lg font-semibold text-gray-900">{v ?? "n/a"}</p>
            </div>
          ))}
        </div>
      </AdminCard>

      <AdminCard title="Recent research scrapes">
        {data.scrapeLog.length === 0 ? (
          <p className="text-sm text-gray-500">No runs logged.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {data.scrapeLog.map((s, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span className={s.ok ? "text-gray-900" : "text-red-600"}>{s.source} · {s.items_found} items{s.error ? ` · ${s.error}` : ""}</span>
                <span className="text-gray-500">{new Date(s.ran_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
    </div>
  );
}
