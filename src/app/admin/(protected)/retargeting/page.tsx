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

type Member = {
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  currentPlanLabel: string;
  entitlementActive: boolean;
  expiresAt: string | null;
  paidOrderCount: number;
  memberKind: "free" | "paid_active" | "paid_lapsed" | "admin";
};

type Template = {
  id: string;
  label: string;
  goal: string;
  segments: string[];
};

type GrantPlan = { id: string; name: string; priceInr: number | null };

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

const MEMBER_KIND_LABEL: Record<string, string> = {
  free: "Free signup",
  paid_active: "Paid · active",
  paid_lapsed: "Paid · lapsed",
  admin: "Admin",
};

type ViewMode = "members" | "campaign";

export default function AdminRetargetingPage() {
  const [view, setView] = useState<ViewMode>("members");
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [memberStats, setMemberStats] = useState<{
    total: number;
    free: number;
    paidActive: number;
    paidLapsed: number;
  } | null>(null);
  const [grantPlans, setGrantPlans] = useState<GrantPlan[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [stats, setStats] = useState<{ total: number; active: number; lapsed: number } | null>(null);
  const [recentSends, setRecentSends] = useState<RecentSend[]>([]);
  const [emailConfigured, setEmailConfigured] = useState(true);
  const [sandboxMode, setSandboxMode] = useState(false);
  const [segmentFilter, setSegmentFilter] = useState<string>("all");
  const [memberKindFilter, setMemberKindFilter] = useState<string>("all");
  const [templateId, setTemplateId] = useState("");
  const [grantPlanId, setGrantPlanId] = useState("pro_monthly");
  const [personalNote, setPersonalNote] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewEmail, setPreviewEmail] = useState("");
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);
  const [previewKind, setPreviewKind] = useState<"campaign" | "grant">("campaign");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [sending, setSending] = useState(false);
  const [granting, setGranting] = useState(false);

  const load = useCallback(() => {
    fetch("/api/admin/retargeting")
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error ?? "Failed to load");
        setCustomers(json.customers);
        setMembers(json.members ?? []);
        setMemberStats(json.memberStats ?? null);
        setGrantPlans(json.grantPlans ?? []);
        setTemplates(json.templates);
        setStats(json.stats);
        setRecentSends(json.recentSends ?? []);
        setEmailConfigured(json.emailConfigured);
        setSandboxMode(Boolean(json.sandboxMode));
        setTemplateId((prev) => prev || json.templates?.[0]?.id || "");
        setGrantPlanId((prev) => prev || json.grantPlans?.[0]?.id || "pro_monthly");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredPaid = useMemo(() => {
    const list = customers ?? [];
    if (segmentFilter === "all") return list;
    return list.filter((c) => c.segment === segmentFilter);
  }, [customers, segmentFilter]);

  const filteredMembers = useMemo(() => {
    const list = members ?? [];
    if (memberKindFilter === "all") return list;
    return list.filter((m) => m.memberKind === memberKindFilter);
  }, [members, memberKindFilter]);

  async function loadCampaignPreview(email: string) {
    if (!email || !templateId) return;
    setPreview(null);
    setPreviewKind("campaign");
    const q = new URLSearchParams({ preview: email, templateId });
    const r = await fetch(`/api/admin/retargeting?${q}`);
    const json = await r.json();
    if (json.preview) setPreview(json.preview);
    else setError(json.previewError ?? "Preview failed");
  }

  async function loadGrantPreview(email: string) {
    if (!email || !grantPlanId) return;
    setPreview(null);
    setPreviewKind("grant");
    setPreviewEmail(email);
    const q = new URLSearchParams({
      grantPreview: email,
      grantPlanId,
      grantNote: personalNote,
    });
    const r = await fetch(`/api/admin/retargeting?${q}`);
    const json = await r.json();
    if (json.grantPreview) setPreview({ subject: json.grantPreview.subject, html: json.grantPreview.html });
    else setError(json.grantPreviewError ?? "Grant preview failed");
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

  async function grantSelected(notify: boolean) {
    setGranting(true);
    setError("");
    setOk("");
    try {
      if (selected.size === 0) throw new Error("Select at least one member.");
      const res = await fetch("/api/admin/retargeting/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: grantPlanId,
          emails: [...selected],
          notify,
          personalNote,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Grant failed");
      setOk(`Granted ${json.granted}, emailed ${json.emailed}, failed ${json.failed}.`);
      if (json.errors?.length) setError(json.errors.join(" · "));
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Grant failed");
    } finally {
      setGranting(false);
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

  const grantPlanLabel = grantPlans.find((p) => p.id === grantPlanId)?.name ?? grantPlanId;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mt-1 text-xl font-semibold">Members, comps &amp; win-back</h1>
        <p className="mt-1 text-sm text-gray-500">
          Every signup in one table. Comp a plan (no Razorpay), send a friendly “here’s what you unlocked” email with
          real links — or run upsell/win-back on people who already paid.
        </p>
      </div>

      {!emailConfigured ? (
        <p className="text-sm text-rose-600">RESEND_API_KEY missing — campaign/grant emails disabled.</p>
      ) : null}
      {sandboxMode ? (
        <p className="text-sm text-amber-700">Resend sandbox — only delivers to your Resend account email.</p>
      ) : null}

      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button
          type="button"
          onClick={() => setView("members")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${view === "members" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
        >
          All members &amp; comps
        </button>
        <button
          type="button"
          onClick={() => setView("campaign")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${view === "campaign" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
        >
          Paid retargeting
        </button>
      </div>

      {view === "members" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <AdminStat label="Registered" value={memberStats?.total ?? "—"} href="/admin/customers" />
          <AdminStat
            label="Free"
            value={memberStats?.free ?? "—"}
            onClick={() => {
              setMemberKindFilter("free");
              document.getElementById("members-table")?.scrollIntoView({ behavior: "smooth" });
            }}
          />
          <AdminStat
            label="Paid active"
            value={memberStats?.paidActive ?? "—"}
            onClick={() => {
              setMemberKindFilter("paid_active");
              document.getElementById("members-table")?.scrollIntoView({ behavior: "smooth" });
            }}
          />
          <AdminStat
            label="Paid lapsed"
            value={memberStats?.paidLapsed ?? "—"}
            onClick={() => {
              setMemberKindFilter("paid_lapsed");
              document.getElementById("members-table")?.scrollIntoView({ behavior: "smooth" });
            }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <AdminStat
            label="Paid audience"
            value={stats?.total ?? "—"}
            onClick={() => {
              setSegmentFilter("all");
              document.getElementById("paid-audience-table")?.scrollIntoView({ behavior: "smooth" });
            }}
          />
          <AdminStat
            label="Active entitlement"
            value={stats?.active ?? "—"}
            onClick={() => {
              setSegmentFilter("active");
              document.getElementById("paid-audience-table")?.scrollIntoView({ behavior: "smooth" });
            }}
          />
          <AdminStat
            label="Lapsed"
            value={stats?.lapsed ?? "—"}
            onClick={() => {
              setSegmentFilter("lapsed");
              document.getElementById("paid-audience-table")?.scrollIntoView({ behavior: "smooth" });
            }}
          />
        </div>
      )}

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {ok ? <p className="text-sm text-emerald-600">{ok}</p> : null}

      {view === "members" ? (
        <AdminCard
          title="Complimentary plan"
          subtitle="Grants pro_plan + expiry in DB. Optional email lists features with links (/dashboard, AI Desk, MCP, etc.)."
        >
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm text-gray-500">Plan to grant</label>
                <select
                  value={grantPlanId}
                  onChange={(e) => {
                    setGrantPlanId(e.target.value);
                    setPreview(null);
                  }}
                  className="w-full rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-sm"
                >
                  {grantPlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.priceInr != null ? ` (retail ₹${p.priceInr})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-gray-500">Note from the desk (optional, in email)</label>
                <input
                  value={personalNote}
                  onChange={(e) => setPersonalNote(e.target.value)}
                  maxLength={500}
                  placeholder="e.g. Thanks for the feedback call — poke around and tell us what breaks."
                  className="w-full rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-sm"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={granting || selected.size === 0}
                onClick={() => grantSelected(false)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
              >
                {granting ? "Working…" : `Grant ${grantPlanLabel} · ${selected.size} selected (silent)`}
              </button>
              <button
                type="button"
                disabled={granting || !emailConfigured || selected.size === 0}
                onClick={() => grantSelected(true)}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {granting ? "Working…" : `Grant + send welcome email · ${selected.size}`}
              </button>
            </div>
          </div>
        </AdminCard>
      ) : (
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
      )}

      {view === "members" ? (
        <AdminCard id="members-table" title="All registered customers" subtitle={`${filteredMembers.length} row(s)`}>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <label className="text-sm text-gray-500">Filter</label>
            <select
              value={memberKindFilter}
              onChange={(e) => setMemberKindFilter(e.target.value)}
              className="rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-sm"
            >
              <option value="all">Everyone</option>
              {Object.entries(MEMBER_KIND_LABEL).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="py-2 pr-2" />
                  <th className="py-2 pr-2">Email</th>
                  <th className="py-2 pr-2">Kind</th>
                  <th className="py-2 pr-2">Plan</th>
                  <th className="py-2 pr-2">Expires</th>
                  <th className="py-2 pr-2">Joined</th>
                  <th className="py-2">Grant preview</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((m) => (
                  <tr key={m.email} className="border-b border-gray-100">
                    <td className="py-2 pr-2">
                      <input
                        type="checkbox"
                        disabled={m.memberKind === "admin"}
                        checked={selected.has(m.email)}
                        onChange={() => toggle(m.email)}
                      />
                    </td>
                    <td className="py-2 pr-2 max-w-[200px] truncate">{m.email}</td>
                    <td className="py-2 pr-2">{MEMBER_KIND_LABEL[m.memberKind] ?? m.memberKind}</td>
                    <td className="py-2 pr-2">{m.currentPlanLabel}</td>
                    <td className="py-2 pr-2 tabular-nums">
                      {m.expiresAt ? new Date(m.expiresAt).toLocaleDateString("en-IN") : "—"}
                    </td>
                    <td className="py-2 pr-2 tabular-nums text-gray-500">
                      {new Date(m.createdAt).toLocaleDateString("en-IN")}
                    </td>
                    <td className="py-2">
                      <button
                        type="button"
                        className="text-blue-600 hover:underline text-xs"
                        disabled={m.memberKind === "admin"}
                        onClick={() => loadGrantPreview(m.email)}
                      >
                        Preview email
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {members && members.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">No users in database yet.</p>
            ) : null}
          </div>
        </AdminCard>
      ) : (
        <AdminCard id="paid-audience-table" title="Paid audience" subtitle={`${filteredPaid.length} row(s)`}>
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
                {filteredPaid.map((c) => (
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
                          loadCampaignPreview(c.email);
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
      )}

      {preview ? (
        <AdminCard
          title={`Preview · ${previewEmail}`}
          subtitle={previewKind === "grant" ? `Grant · ${grantPlanLabel} · ${preview.subject}` : preview.subject}
        >
          <iframe
            title="Email preview"
            className="h-[360px] w-full rounded border border-gray-200 bg-white"
            srcDoc={preview.html}
          />
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
