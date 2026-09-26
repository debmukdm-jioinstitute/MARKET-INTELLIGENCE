"use client";

import { AdminCard } from "@/components/admin/admin-card";
import { DEFAULT_LOCK_MESSAGE } from "@/lib/portal-page-registry";
import { useMemo, useState } from "react";
import { useEffect } from "react";

type Control = {
  href: string;
  label: string;
  nav_section: string;
  nav_group: string;
  sort_order: number;
  enabled: boolean;
  locked: boolean;
  lock_message: string | null;
  applies_to_children: boolean;
};

export default function AdminPortalPagesPage() {
  const [controls, setControls] = useState<Control[] | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  function load() {
    fetch("/api/admin/pages")
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error ?? "Failed to load pages");
        setControls(json.controls ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }

  useEffect(load, []);

  async function patch(href: string, body: Record<string, unknown>) {
    setBusy(href);
    setError("");
    try {
      const res = await fetch("/api/admin/pages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ href, ...body }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Update failed");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(null);
    }
  }

  async function bulkPrefix(prefix: string, body: Record<string, unknown>) {
    setBusy(prefix);
    setError("");
    try {
      const res = await fetch("/api/admin/pages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bulk: { prefix, ...body } }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Bulk update failed");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bulk update failed");
    } finally {
      setBusy(null);
    }
  }

  const grouped = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const rows = (controls ?? []).filter(
      (c) =>
        !q ||
        c.label.toLowerCase().includes(q) ||
        c.href.toLowerCase().includes(q) ||
        c.nav_section.toLowerCase().includes(q) ||
        c.nav_group.toLowerCase().includes(q),
    );
    const map = new Map<string, Map<string, Control[]>>();
    for (const c of rows) {
      if (!map.has(c.nav_section)) map.set(c.nav_section, new Map());
      const g = map.get(c.nav_section)!;
      if (!g.has(c.nav_group)) g.set(c.nav_group, []);
      g.get(c.nav_group)!.push(c);
    }
    return map;
  }, [controls, filter]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-blue-600">Portal control</p>
        <h1 className="mt-1 text-xl font-semibold">Pages &amp; features</h1>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Toggle pages off to hide them from navigation, command palette, and direct URLs. Lock a page to keep it visible
          in menus but show an &quot;under construction&quot; screen on the live site. Changes apply within ~30 seconds (no deploy).
          Signed-in <strong>admins</strong> bypass locks when previewing the portal.
        </p>
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <AdminCard title="Quick actions">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => bulkPrefix("/algo", { locked: true })}
            className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
          >
            Lock all Algo desk
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => bulkPrefix("/algo", { locked: false, enabled: true })}
            className="rounded-md border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            Unlock Algo desk
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => bulkPrefix("/macro", { enabled: true, locked: false })}
            className="rounded-md border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            Enable all macro routes
          </button>
        </div>
      </AdminCard>

      <AdminCard title="Registry">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by name, path, section…"
          className="mb-4 w-full max-w-md rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-sm outline-none focus:border-blue-600"
        />

        {!controls ? <p className="text-sm text-gray-500">Loading…</p> : null}

        <div className="space-y-6">
          {[...grouped.entries()].map(([section, groups]) => (
            <section key={section}>
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-700">{section}</h2>
              {[...groups.entries()].map(([group, rows]) => (
                <div key={group} className="mb-4">
                  {group ? <p className="mb-1 text-xs font-medium text-gray-500">{group}</p> : null}
                  <ul className="space-y-1">
                    {rows.map((c) => (
                      <li
                        key={c.href}
                        className="flex flex-col gap-2 rounded-lg border border-gray-200 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {c.label}
                            {c.applies_to_children ? (
                              <span className="ml-2 rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-gray-600">
                                + nested URLs
                              </span>
                            ) : null}
                          </p>
                          <p className="truncate font-mono text-xs text-gray-500">{c.href}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={busy === c.href}
                            onClick={() => patch(c.href, { enabled: !c.enabled, locked: c.enabled ? c.locked : false })}
                            className={`rounded px-2 py-1 text-[11px] font-semibold ${c.enabled ? "bg-emerald-500/20 text-emerald-700" : "bg-gray-200 text-gray-600"}`}
                          >
                            {c.enabled ? "Live" : "Hidden"}
                          </button>
                          <button
                            type="button"
                            disabled={busy === c.href || !c.enabled}
                            onClick={() => patch(c.href, { locked: !c.locked })}
                            className={`rounded px-2 py-1 text-[11px] font-semibold ${c.locked ? "bg-amber-500/25 text-amber-800" : "bg-gray-100 text-gray-600"}`}
                          >
                            {c.locked ? "Locked" : "Lock"}
                          </button>
                          {c.locked ? (
                            <input
                              defaultValue={c.lock_message ?? DEFAULT_LOCK_MESSAGE}
                              onBlur={(e) => {
                                const msg = e.target.value.trim();
                                if (msg !== (c.lock_message ?? DEFAULT_LOCK_MESSAGE)) {
                                  patch(c.href, { lock_message: msg || null });
                                }
                              }}
                              className="min-w-[200px] flex-1 rounded border border-gray-200 px-2 py-1 text-xs"
                              placeholder={DEFAULT_LOCK_MESSAGE}
                            />
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))}
        </div>

        {controls && controls.length === 0 ? (
          <p className="text-sm text-gray-500">No pages — configure DATABASE_URL and refresh.</p>
        ) : null}
      </AdminCard>
    </div>
  );
}
