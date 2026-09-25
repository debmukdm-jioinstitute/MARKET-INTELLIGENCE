"use client";

import { AdminCard } from "@/components/admin/admin-card";
import { useEffect, useState } from "react";

type Sub = { email: string; pre: boolean; post: boolean; created_at: string };
type BriefRow = { id: number; kind: string; engine: string; generated_at: string; emailed_at: string | null; items: number };
type Data = { subscribers: Sub[]; briefs: BriefRow[]; totals: { subscribers: number; pre: number; post: number } };

export default function AdminBriefPage() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  function load() {
    fetch("/api/admin/brief")
      .then((r) => r.json())
      .then((j) => (j.error ? setError(j.error) : setData(j)))
      .catch(() => setError("Failed to load"));
  }
  useEffect(load, []);

  async function patch(email: string, body: { pre?: boolean; post?: boolean }) {
    await fetch("/api/admin/brief", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, ...body }) });
    load();
  }
  async function remove(email: string) {
    if (!confirm(`Remove ${email} from brief emails?`)) return;
    await fetch(`/api/admin/brief?email=${encodeURIComponent(email)}`, { method: "DELETE" });
    load();
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-sm text-gray-500">Loading…</p>;
  const subs = data.subscribers.filter((s) => s.email.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-blue-600">Daily brief</p>
        <h1 className="text-2xl font-semibold text-gray-900">Subscribers and generated briefs</h1>
        <p className="text-sm text-gray-500">{data.totals.subscribers} subscribers · {data.totals.pre} pre-market · {data.totals.post} post-market</p>
      </div>

      <AdminCard
        title="Subscribers"
        action={<input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter email" className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900" />}
      >
        {subs.length === 0 ? (
          <p className="text-sm text-gray-500">No subscribers.</p>
        ) : (
          <div className="divide-y divide-gray-200">
            {subs.map((s) => (
              <div key={s.email} className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm">
                <div>
                  <p className="text-gray-900">{s.email}</p>
                  <p className="text-gray-500">Joined {new Date(s.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-4 text-gray-800">
                  <label className="flex items-center gap-1"><input type="checkbox" checked={s.pre} onChange={(e) => patch(s.email, { pre: e.target.checked })} /> Pre</label>
                  <label className="flex items-center gap-1"><input type="checkbox" checked={s.post} onChange={(e) => patch(s.email, { post: e.target.checked })} /> Post</label>
                  <button onClick={() => remove(s.email)} className="text-red-600 hover:underline">Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminCard>

      <AdminCard title="Recent briefs" subtitle="Generate a new one from System & Jobs → /api/cron/brief.">
        <ul className="space-y-1 text-sm text-gray-900">
          {data.briefs.map((b) => (
            <li key={b.id} className="flex justify-between gap-2">
              <span>#{b.id} · {b.kind} · {b.engine} · {b.items} items</span>
              <span className="text-gray-500">{new Date(b.generated_at).toLocaleString()} · {b.emailed_at ? "emailed" : "not emailed"}</span>
            </li>
          ))}
          {data.briefs.length === 0 ? <li className="text-gray-500">None yet.</li> : null}
        </ul>
      </AdminCard>
    </div>
  );
}
