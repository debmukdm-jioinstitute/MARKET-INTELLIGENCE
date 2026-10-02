"use client";

import { AdminCard, AdminStat } from "@/components/admin/admin-card";
import { useCallback, useEffect, useMemo, useState } from "react";

type Customer = {
  email: string;
  name: string | null;
  segment: string;
  suggestedTemplateId: string;
  currentPlanLabel: string;
  entitlementActive: boolean;
  expiresAt: string | null;
  lastPaidAt: string | null;
  paidOrderCount: number;
};

type Template = {
  id: string;
  label: string;
  goal: string;
  segments: string[];
};

type RecentSend = {
  template_id: string;
  recipient_email: string;
  subject: string;
  sent_at: string;
};

const SEGMENT_LABEL: Record<string, string> = {
  active_day_pass: "Active · daily pass",
  active_plus: "Active · Plus",
  active_annual: "Active · Pro yearly",
  lapsed_paid: "Lapsed · was paid",
  expiring_soon: "Plus expiring ≤7d",
};

export default function AdminRetargetingPage() {
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [stats, setStats] = useState<{ total: number; active: number; lapsed: number } | null>(null);
  const [recentSends, setRecentSends] = useState<RecentSend[]>([]);
  const [emailConfigured, setEmailConfigured] = useState(true);
  const [sandboxMode, setSandboxMode] = useState(false);
  const [segmentFilter, setSegmentFilter] = useState<string>("all");
  const [templateId, setTemplateId] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewEmail, setPreviewEmail] = useState("");
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(() => {
    fetch("/api/admin/retargeting")
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error ?? "Failed to load");
        setCustomers(json.customers);
        setTemplates(json.templates);
        setStats(json.stats);
        setRecentSends(json.recentSends ?? []);
        setEmailConfigured(json.emailConfigured);
        setSandboxMode(Boolean(json.sandboxMode));
        setTemplateId((prev) => prev || json.templates?.[0]?.id || "");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const list = customers ?? [];
    if (segmentFilter === "all") return list;
    return list.filter((c) => c.segment === segmentFilter);
  }, [customers, segmentFilter]);

  async function loadPreview(email: string) {
    if (!email || !templateId) return;
    setPreview(null);
    const q = new URLSearchParams({ preview: email, templateId });
    const r = await fetch(`/api/admin/retargeting?${q}`);
    const json = await r.json();
    if (json.preview) setPreview(json.preview);
    else setError(json.previewError ?? "Preview failed");
  }

  async function send(mode: "segment" | "selected") {
    setSending(true);
    setError("");
    setOk("");
    try {
      const body: Record<string, unknown> = { templateId };
      if (mode === "selected") {
        if (selected.size === 0) throw new Error("Select at least one customer.");
        body.emails = [...selected];
      } else if (segmentFilter !== "all") {
        body.segment = segmentFilter;
      }
      const res = await fetch("/api/admin/retargeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Send failed");
      setOk(`Sent ${json.sent}, failed ${json.failed}.`);
      if (json.errors?.length) setError(json.errors.join(" · "));
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  function toggle(email: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-blue-600">Retargeting</p>
        <h1 className="mt-1 text-xl font-semibold">Paid customers · upsell &amp; win-back</h1>
        <p className="mt-1 text-sm text-gray-500">
          Everyone who paid (now or before). Templates fill name, plan, expiry, and pricing links per recipient.
        </p>
      </div>

      {!emailConfigured ? (
        <p className="text-sm text-rose-600">RESEND_API_KEY missing — sends disabled.</p>
      ) : null}
      {sandboxMode ? (
        <p className="text-sm text-amber-700">Resend sandbox — only delivers to your Resend account email.</p>
      ) : null}

      <div className="grid grid-cols-3 gap-3">
        <AdminStat label="Paid audience" value={stats?.total ?? "—"} />
        <AdminStat label="Active entitlement" value={stats?.active ?? "—"} />
        <AdminStat label="Lapsed" value={stats?.lapsed ?? "—"} />
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {ok ? <p className="text-sm text-emerald-600">{ok}</p> : null}

      <AdminCard title="Campaign" subtitle="Pick template → filter → preview → send">
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm text-gray-500">Email template</label>
              <select
                value={templateId}
                onChange={(e) => {
                  setTemplateId(e.target.value);
                  setPreview(null);
                }}
                className="w-full rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-sm"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label} ({t.goal})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-gray-500">Segment filter</label>
              <select
                value={segmentFilter}
                onChange={(e) => setSegmentFilter(e.target.value)}
                className="w-full rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-sm"
              >
                <option value="all">All paid customers (template segments)</option>
                {Object.entries(SEGMENT_LABEL).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={sending || !emailConfigured || !templateId}
              onClick={() => send("segment")}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {sending ? "Sending…" : segmentFilter === "all" ? "Send to matching segments" : "Send to segment"}
            </button>
            <button
              type="button"
              disabled={sending || !emailConfigured || selected.size === 0}
              onClick={() => send("selected")}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Send to {selected.size} selected
            </button>
          </div>
        </div>
      </AdminCard>

      <AdminCard title="Audience" subtitle={`${filtered.length} row(s)`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="py-2 pr-2" />
                <th className="py-2 pr-2">Email</th>
                <th className="py-2 pr-2">Segment</th>
                <th className="py-2 pr-2">Plan</th>
                <th className="py-2 pr-2">Expires</th>
                <th className="py-2 pr-2">Suggested</th>
                <th className="py-2">Preview</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.email} className="border-b border-gray-100">
                  <td className="py-2 pr-2">
                    <input type="checkbox" checked={selected.has(c.email)} onChange={() => toggle(c.email)} />
                  </td>
                  <td className="py-2 pr-2 max-w-[200px] truncate">{c.email}</td>
                  <td className="py-2 pr-2">{SEGMENT_LABEL[c.segment] ?? c.segment}</td>
                  <td className="py-2 pr-2">{c.currentPlanLabel}</td>
                  <td className="py-2 pr-2 tabular-nums">
                    {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("en-IN") : "—"}
                  </td>
                  <td className="py-2 pr-2 text-xs text-gray-500">{c.suggestedTemplateId || "—"}</td>
                  <td className="py-2">
                    <button
                      type="button"
                      className="text-blue-600 hover:underline text-xs"
                      onClick={() => {
                        setPreviewEmail(c.email);
                        loadPreview(c.email);
                      }}
                    >
                      Preview
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {customers && customers.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">No paid customers yet (Razorpay orders or pro_plan on file).</p>
          ) : null}
        </div>
      </AdminCard>

      {preview ? (
        <AdminCard title={`Preview · ${previewEmail}`} subtitle={preview.subject}>
          <iframe title="Email preview" className="h-[360px] w-full rounded border border-gray-200 bg-white" srcDoc={preview.html} />
        </AdminCard>
      ) : null}

      <AdminCard title="Recent sends">
        <ul className="space-y-1 text-sm text-gray-600">
          {recentSends.map((s, i) => (
            <li key={i}>
              {new Date(s.sent_at).toLocaleString()} · {s.template_id} → {s.recipient_email}
            </li>
          ))}
          {recentSends.length === 0 ? <li className="text-gray-500">No retargeting sends logged yet.</li> : null}
        </ul>
      </AdminCard>
    </div>
  );
}
