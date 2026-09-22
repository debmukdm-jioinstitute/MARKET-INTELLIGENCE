"use client";

import { AdminCard } from "@/components/admin/admin-card";
import { useEffect, useState } from "react";

type Update = { id: string; title: string; body: string; severity: "info" | "warning" | "critical"; published: boolean; created_at: string };

export default function AdminUpdatesPage() {
  const [updates, setUpdates] = useState<Update[] | null>(null);
  const [form, setForm] = useState({ title: "", body: "", severity: "info" as Update["severity"] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function load() {
    fetch("/api/admin/updates")
      .then((r) => r.json())
      .then((json) => setUpdates(json.updates))
      .catch(() => {});
  }
  useEffect(load, []);

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to publish");
      setForm({ title: "", body: "", severity: "info" });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to publish");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(u: Update) {
    await fetch(`/api/admin/updates/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !u.published }),
    });
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/admin/updates/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-400">App updates</p>
        <h1 className="mt-1 text-xl font-semibold">Update banners</h1>
        <p className="mt-1 text-sm text-neutral-500">The most recent published update shows as a dismissible banner in the main app.</p>
      </div>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      <AdminCard title="Publish an update">
        <form onSubmit={publish} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-neutral-400">Title</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-2.5 py-1.5 text-sm outline-none focus:border-amber-400"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-neutral-400">Body</label>
            <textarea
              required
              rows={3}
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-2.5 py-1.5 text-sm outline-none focus:border-amber-400"
            />
          </div>
          <div className="flex items-center gap-3">
            <select
              value={form.severity}
              onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value as Update["severity"] }))}
              className="rounded-md border border-neutral-800 bg-neutral-900 px-2.5 py-1.5 text-sm outline-none focus:border-amber-400"
            >
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-amber-400 px-3 py-1.5 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Publishing…" : "Publish"}
            </button>
          </div>
        </form>
      </AdminCard>

      <AdminCard title="History">
        <div className="space-y-2">
          {(updates ?? []).map((u) => (
            <div key={u.id} className="rounded-md border border-neutral-800 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-neutral-100">
                    {u.title} <span className="ml-1 text-[10px] uppercase text-neutral-500">{u.severity}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-400">{u.body}</p>
                  <p className="mt-1 text-[10px] text-neutral-600">{new Date(u.created_at).toLocaleString()}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => togglePublished(u)}
                    className={`rounded px-2 py-1 text-[11px] font-semibold ${u.published ? "bg-emerald-500/20 text-emerald-300" : "bg-neutral-800 text-neutral-400"}`}
                  >
                    {u.published ? "Published" : "Hidden"}
                  </button>
                  <button type="button" onClick={() => remove(u.id)} className="rounded px-2 py-1 text-[11px] text-rose-400 hover:bg-rose-500/10">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
          {updates && updates.length === 0 ? <p className="text-sm text-neutral-500">No updates yet.</p> : null}
        </div>
      </AdminCard>
    </div>
  );
}
