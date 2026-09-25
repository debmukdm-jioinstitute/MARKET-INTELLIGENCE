"use client";

import { AdminCard } from "@/components/admin/admin-card";
import { useEffect, useState } from "react";

type Cond = { metric: string; op: string; value: number };
type Rule = { id: string; user_email: string; name: string; conditions: Cond[]; combinator: string; channels: string[]; cooldown_hours: number; active: boolean; last_fired_at: string | null; created_at: string };
type Ev = { id: number; user_email: string; fired_at: string; message: string; push_sent: number; email_sent: boolean };
type Data = { rules: Rule[]; events: Ev[]; totals: { rules: number; active: number; users: number } };

export default function AdminAlertsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  function load() {
    fetch("/api/admin/alerts")
      .then((r) => r.json())
      .then((j) => (j.error ? setError(j.error) : setData(j)))
      .catch(() => setError("Failed to load"));
  }
  useEffect(load, []);

  async function toggle(r: Rule) {
    await fetch("/api/admin/alerts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: r.id, active: !r.active }) });
    load();
  }
  async function remove(r: Rule) {
    if (!confirm(`Delete rule "${r.name}" for ${r.user_email}?`)) return;
    await fetch(`/api/admin/alerts?id=${r.id}`, { method: "DELETE" });
    load();
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-sm text-gray-500">Loading…</p>;
  const rules = data.rules.filter((r) => `${r.user_email} ${r.name}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-blue-600">Alert rules</p>
        <h1 className="text-2xl font-semibold text-gray-900">User alerts and firing history</h1>
        <p className="text-sm text-gray-500">{data.totals.rules} rules · {data.totals.active} active · {data.totals.users} users</p>
      </div>

      <AdminCard title="Rules" action={<input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter user / name" className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900" />}>
        {rules.length === 0 ? (
          <p className="text-sm text-gray-500">No rules.</p>
        ) : (
          <div className="divide-y divide-gray-200">
            {rules.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="text-gray-900">{r.name} <span className="text-gray-500">· {r.user_email}</span></p>
                  <p className="text-gray-500">
                    {r.conditions.map((c) => `${c.metric} ${c.op} ${c.value}`).join(r.combinator === "any" ? " OR " : " AND ")} · {r.channels.join("+")} · cooldown {r.cooldown_hours}h · {r.last_fired_at ? `last fired ${new Date(r.last_fired_at).toLocaleString()}` : "never fired"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => toggle(r)} className="rounded-md border border-gray-300 bg-white px-2 py-1 text-gray-800 hover:bg-gray-100">{r.active ? "Pause" : "Resume"}</button>
                  <button onClick={() => remove(r)} className="text-red-600 hover:underline">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminCard>

      <AdminCard title="Recent alerts fired">
        <ul className="space-y-1 text-sm text-gray-900">
          {data.events.map((e) => (
            <li key={e.id} className="flex justify-between gap-2">
              <span>{e.user_email} · {e.message} <span className="text-gray-500">({e.push_sent} push{e.email_sent ? ", email" : ""})</span></span>
              <span className="shrink-0 text-gray-500">{new Date(e.fired_at).toLocaleString()}</span>
            </li>
          ))}
          {data.events.length === 0 ? <li className="text-gray-500">Nothing has fired yet.</li> : null}
        </ul>
      </AdminCard>
    </div>
  );
}
