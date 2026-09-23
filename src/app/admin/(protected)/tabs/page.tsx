"use client";

import { AdminCard } from "@/components/admin/admin-card";
import { useEffect, useState } from "react";

type Tab = {
  id: string;
  label: string;
  href: string;
  icon: string;
  section: string;
  external: boolean;
  badge: string | null;
  sort_order: number;
  enabled: boolean;
};

const ICON_OPTIONS = ["Sparkles", "Newspaper", "TrendingUp", "BarChart3", "Bell", "BookOpen", "Globe2", "Radio", "Database"];

export default function AdminTabsPage() {
  const [tabs, setTabs] = useState<Tab[] | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ label: "", href: "", icon: "Sparkles", section: "FEEDS", external: false, badge: "" });
  const [saving, setSaving] = useState(false);

  function load() {
    fetch("/api/admin/tabs")
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error ?? "Failed to load tabs");
        setTabs(json.tabs);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load tabs"));
  }

  useEffect(load, []);

  async function createTab(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/tabs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, badge: form.badge || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create tab");
      setForm({ label: "", href: "", icon: "Sparkles", section: "FEEDS", external: false, badge: "" });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create tab");
    } finally {
      setSaving(false);
    }
  }

  async function toggleEnabled(tab: Tab) {
    await fetch(`/api/admin/tabs/${tab.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !tab.enabled }),
    });
    load();
  }

  async function removeTab(id: string) {
    await fetch(`/api/admin/tabs/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-blue-600">App tabs</p>
        <h1 className="mt-1 text-xl font-semibold">Sidebar tabs</h1>
        <p className="mt-1 text-sm text-gray-500">
          Enabled tabs appear in the main app&apos;s sidebar within a minute (60s cache), no deploy required.
        </p>
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <AdminCard title="Add a tab">
        <form onSubmit={createTab} className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm text-gray-500">Label</label>
            <input
              required
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              className="w-full rounded-md border border-gray-200 bg-gray-100 px-2.5 py-1.5 text-sm outline-none focus:border-blue-600"
              placeholder="Daily Brief"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-500">Link (internal path or full URL)</label>
            <input
              required
              value={form.href}
              onChange={(e) => setForm((f) => ({ ...f, href: e.target.value }))}
              className="w-full rounded-md border border-gray-200 bg-gray-100 px-2.5 py-1.5 text-sm outline-none focus:border-blue-600"
              placeholder="/research or https://example.com"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-500">Section header</label>
            <input
              value={form.section}
              onChange={(e) => setForm((f) => ({ ...f, section: e.target.value.toUpperCase() }))}
              className="w-full rounded-md border border-gray-200 bg-gray-100 px-2.5 py-1.5 text-sm outline-none focus:border-blue-600"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-500">Icon</label>
            <select
              value={form.icon}
              onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
              className="w-full rounded-md border border-gray-200 bg-gray-100 px-2.5 py-1.5 text-sm outline-none focus:border-blue-600"
            >
              {ICON_OPTIONS.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-500">Badge (optional)</label>
            <input
              value={form.badge}
              onChange={(e) => setForm((f) => ({ ...f, badge: e.target.value.toUpperCase() }))}
              className="w-full rounded-md border border-gray-200 bg-gray-100 px-2.5 py-1.5 text-sm outline-none focus:border-blue-600"
              placeholder="NEW"
            />
          </div>
          <label className="flex items-center gap-2 self-end pb-1.5 text-sm text-gray-500">
            <input
              type="checkbox"
              checked={form.external}
              onChange={(e) => setForm((f) => ({ ...f, external: e.target.checked }))}
            />
            Opens in a new tab (external link)
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Adding…" : "Add tab"}
            </button>
          </div>
        </form>
      </AdminCard>

      <AdminCard title="Existing tabs">
        <div className="space-y-1.5">
          {(tabs ?? []).map((tab) => (
            <div key={tab.id} className="flex items-center justify-between gap-3 rounded-md border border-gray-200 px-3 py-2 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium text-gray-900">
                  {tab.label} <span className="text-gray-500">· {tab.section}</span>
                  {tab.badge ? <span className="ml-1.5 rounded bg-blue-600/20 px-1 text-sm text-blue-600">{tab.badge}</span> : null}
                </p>
                <p className="truncate text-sm text-gray-500">
                  {tab.href} {tab.external ? "↗" : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleEnabled(tab)}
                  className={`rounded px-2 py-1 text-[11px] font-semibold ${tab.enabled ? "bg-emerald-500/20 text-emerald-600" : "bg-gray-200 text-gray-500"}`}
                >
                  {tab.enabled ? "Enabled" : "Disabled"}
                </button>
                <button
                  type="button"
                  onClick={() => removeTab(tab.id)}
                  className="rounded px-2 py-1 text-sm text-rose-600 hover:bg-rose-500/10"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {tabs && tabs.length === 0 ? <p className="text-sm text-gray-500">No custom tabs yet.</p> : null}
        </div>
      </AdminCard>
    </div>
  );
}
