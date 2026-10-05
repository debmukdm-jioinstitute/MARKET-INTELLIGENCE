"use client";

import { AdminCard, AdminStat } from "@/components/admin/admin-card";
import { useEffect, useMemo, useState } from "react";
import {
  Mail,
  Send,
  Clock,
  Eye,
  Check,
  X,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { REENGAGEMENT_FEATURES } from "@/lib/admin/reengagement-email";

type Customer = {
  email: string;
  name: string;
  role: "user" | "admin";
  created_at: string;
  last_login_at: string | null;
};

type LeaderboardEntry = {
  email: string;
  name: string;
  total: number;
  level: string;
  events: number;
  last_event_at: string | null;
};

const LEVEL_STYLES: Record<string, string> = {
  Explorer: "bg-gray-100 text-gray-600",
  Learner: "bg-blue-50 text-blue-700",
  Analyst: "bg-emerald-50 text-emerald-700",
  Strategist: "bg-amber-50 text-amber-700",
};

function levelFor(total: number): string {
  if (total >= 700) return "Strategist";
  if (total >= 300) return "Analyst";
  if (total >= 100) return "Learner";
  return "Explorer";
}

function getInactivityInfo(c: Customer): {
  days: number;
  isNever: boolean;
  label: string;
  badgeClass: string;
} {
  const refString = c.last_login_at || c.created_at;
  const refDate = new Date(refString);
  const diffMs = Date.now() - (isNaN(refDate.getTime()) ? Date.now() : refDate.getTime());
  const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  const isNever = !c.last_login_at;

  if (isNever) {
    return {
      days,
      isNever: true,
      label: `Never logged in (${days}d)`,
      badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  if (days === 0) {
    return {
      days: 0,
      isNever: false,
      label: "Active today",
      badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (days < 7) {
    return {
      days,
      isNever: false,
      label: `${days}d ago`,
      badgeClass: "border-blue-200 bg-blue-50 text-blue-700",
    };
  }

  if (days < 30) {
    return {
      days,
      isNever: false,
      label: `${days}d inactive`,
      badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  return {
    days,
    isNever: false,
    label: `${days}d inactive`,
    badgeClass: "border-rose-200 bg-rose-50 text-rose-700",
  };
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [points, setPoints] = useState<Record<string, LeaderboardEntry> | null>(null);
  const [pointsError, setPointsError] = useState("");
  const [pointsSort, setPointsSort] = useState<"desc" | "asc">("desc");
  const [filterMode, setFilterMode] = useState<"all" | "inactive-7" | "inactive-30" | "never">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [you, setYou] = useState("");
  const [error, setError] = useState("");
  const [resetTarget, setResetTarget] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  // Nudge Modal State
  const [nudgeTarget, setNudgeTarget] = useState<Customer | null>(null);
  const [nudgeSubject, setNudgeSubject] = useState("");
  const [nudgeMarketUpdate, setNudgeMarketUpdate] = useState("");
  const [selectedFeatureKeys, setSelectedFeatureKeys] = useState<string[]>(
    REENGAGEMENT_FEATURES.map((f) => f.key),
  );
  const [nudgePreviewHtml, setNudgePreviewHtml] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [modalTab, setModalTab] = useState<"compose" | "preview">("compose");
  const [sendingNudge, setSendingNudge] = useState(false);
  const [nudgeSuccess, setNudgeSuccess] = useState<string | null>(null);
  const [nudgeError, setNudgeError] = useState<string | null>(null);

  function load() {
    fetch("/api/admin/customers")
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error ?? "Failed to load customers");
        setCustomers(json.customers);
        setYou(typeof json.you === "string" ? json.you : "");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load customers"));
  }
  useEffect(load, []);

  function loadPoints() {
    fetch("/api/admin/gamification/leaderboard")
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error ?? "Failed to load points");
        const map: Record<string, LeaderboardEntry> = {};
        for (const u of json.users ?? []) {
          if (u && typeof u.email === "string") map[u.email.toLowerCase()] = u as LeaderboardEntry;
        }
        setPoints(map);
      })
      .catch(() => setPointsError("Points could not be loaded."));
  }
  useEffect(loadPoints, []);

  // Filter & sort
  const rows = useMemo(() => {
    const list = (customers ?? []).map((c) => ({
      ...c,
      pts: points?.[c.email.toLowerCase()] ?? null,
      inactivity: getInactivityInfo(c),
    }));

    // Filter by mode
    const filtered = list.filter((c) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesEmail = c.email.toLowerCase().includes(q);
        const matchesName = (c.name || "").toLowerCase().includes(q);
        if (!matchesEmail && !matchesName) return false;
      }

      if (filterMode === "inactive-7") return c.inactivity.days >= 7;
      if (filterMode === "inactive-30") return c.inactivity.days >= 30;
      if (filterMode === "never") return c.inactivity.isNever;
      return true;
    });

    const total = (r: { pts: LeaderboardEntry | null }) => r.pts?.total ?? 0;
    filtered.sort((a, b) => (pointsSort === "desc" ? total(b) - total(a) : total(a) - total(b)));
    return filtered;
  }, [customers, points, pointsSort, filterMode, searchQuery]);

  const totalCustomers = customers?.length ?? 0;
  const withPoints = (customers ?? []).filter(
    (c) => (points?.[c.email.toLowerCase()]?.total ?? 0) > 0,
  ).length;
  const totalPoints = Object.values(points ?? {}).reduce((s, r) => s + (r.total ?? 0), 0);
  const _avgActive = withPoints > 0 ? Math.round(totalPoints / withPoints) : null;

  const inactive7Count = useMemo(() => {
    return (customers ?? []).filter((c) => getInactivityInfo(c).days >= 7).length;
  }, [customers]);

  const inactive30Count = useMemo(() => {
    return (customers ?? []).filter((c) => getInactivityInfo(c).days >= 30).length;
  }, [customers]);

  const neverCount = useMemo(() => {
    return (customers ?? []).filter((c) => !c.last_login_at).length;
  }, [customers]);

  // Open Nudge Modal
  async function openNudgeModal(c: Customer) {
    setNudgeTarget(c);
    setNudgeSuccess(null);
    setNudgeError(null);
    setModalTab("compose");
    setPreviewLoading(true);

    try {
      const res = await fetch(`/api/admin/customers/nudge?email=${encodeURIComponent(c.email)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load email preview");
      setNudgeSubject(json.preview.subject);
      setNudgeMarketUpdate(json.preview.summaryText || "");
      setNudgePreviewHtml(json.preview.html);
    } catch (e) {
      setNudgeError(e instanceof Error ? e.message : "Failed to load preview");
    } finally {
      setPreviewLoading(false);
    }
  }

  // Refresh preview with edits
  async function refreshPreview() {
    if (!nudgeTarget) return;
    setPreviewLoading(true);
    setNudgeError(null);

    try {
      const res = await fetch("/api/admin/customers/nudge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: nudgeTarget.email,
          customSubject: nudgeSubject,
          customMarketUpdate: nudgeMarketUpdate,
          includedFeatureKeys: selectedFeatureKeys,
          previewOnly: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to update preview");
      setNudgePreviewHtml(json.preview.html);
    } catch (e) {
      setNudgeError(e instanceof Error ? e.message : "Failed to update preview");
    } finally {
      setPreviewLoading(false);
    }
  }

  // Send Nudge
  async function sendNudgeEmail() {
    if (!nudgeTarget) return;
    setSendingNudge(true);
    setNudgeError(null);
    setNudgeSuccess(null);

    try {
      const res = await fetch("/api/admin/customers/nudge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: nudgeTarget.email,
          customSubject: nudgeSubject,
          customMarketUpdate: nudgeMarketUpdate,
          includedFeatureKeys: selectedFeatureKeys,
          previewOnly: false,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to send email");
      setNudgeSuccess(
        `Re-engagement email sent successfully to ${json.sentTo} (${json.daysInactive} days inactive) via ${json.provider ?? "Resend"}.`,
      );
    } catch (e) {
      setNudgeError(e instanceof Error ? e.message : "Failed to send email");
    } finally {
      setSendingNudge(false);
    }
  }

  function toggleFeature(key: string) {
    setSelectedFeatureKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  async function submitReset(email: string) {
    setResetting(true);
    setResetMessage("");
    try {
      const res = await fetch("/api/admin/customers/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newPassword }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to reset password");
      setResetMessage(`Password updated for ${email}.`);
      setResetTarget(null);
      setNewPassword("");
    } catch (e) {
      setResetMessage(e instanceof Error ? e.message : "Failed to reset password");
    } finally {
      setResetting(false);
    }
  }

  async function deleteAccount(email: string) {
    if (!confirm(`Delete account ${email}? This cannot be undone.`)) return;
    setDeleting(email);
    try {
      const res = await fetch("/api/admin/customers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to delete account");
      setCustomers((prev) => (prev ? prev.filter((c) => c.email !== email) : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete account");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Customers</h1>
          <p className="mt-1 text-sm text-gray-500">
            Accounts, authentication roles, gamified points, and personalized re-engagement email nudges.
          </p>
        </div>
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {resetMessage ? <p className="text-sm text-emerald-600">{resetMessage}</p> : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <AdminStat label="Total customers" value={customers ? totalCustomers : "…"} href="#customer-table" />
        <AdminStat label="Customers with points" value={points ? withPoints : "—"} href="/admin/competition" />
        <AdminStat label="Total points awarded" value={points ? totalPoints.toLocaleString() : "—"} href="/admin/competition" />
        <AdminStat
          label="Inactive accounts (>7d)"
          value={customers ? inactive7Count : "—"}
          onClick={() => {
            setFilterMode("inactive-7");
            document.getElementById("customer-table")?.scrollIntoView({ behavior: "smooth" });
          }}
        />
      </div>

      <AdminCard
        id="customer-table"
        title="All accounts"
        subtitle={
          pointsError
            ? "Gamified points are unavailable right now — the customer list below is unaffected."
            : points
              ? "Filter by activity, send dynamic re-engagement nudges, or sort by points."
              : "Loading points…"
        }
      >
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-gray-400">Filter:</span>
              <button
                type="button"
                onClick={() => setFilterMode("all")}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filterMode === "all"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                All ({totalCustomers})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("inactive-7")}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filterMode === "inactive-7"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Inactive &gt; 7d ({inactive7Count})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("inactive-30")}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filterMode === "inactive-30"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Inactive &gt; 30d ({inactive30Count})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("never")}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filterMode === "never"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Never logged in ({neverCount})
              </button>
            </div>

            <div className="w-full sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search email or name…"
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-1 text-xs outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="py-2 pr-3 font-medium">Customer</th>
                  <th className="py-2 pr-3 font-medium">Role</th>
                  <th className="py-2 pr-3 font-medium">Joined</th>
                  <th className="py-2 pr-3 font-medium">Last login / Inactivity</th>
                  <th className="py-2 pr-3 font-medium">
                    <button
                      type="button"
                      onClick={() => setPointsSort((d) => (d === "desc" ? "asc" : "desc"))}
                      className="inline-flex items-center gap-1 hover:text-gray-800"
                      aria-label={`Sort by points ${pointsSort === "desc" ? "ascending" : "descending"}`}
                    >
                      Points
                      <span aria-hidden="true">{pointsSort === "desc" ? "↓" : "↑"}</span>
                    </button>
                  </th>
                  <th className="py-2 pr-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const level = c.pts ? c.pts.level || levelFor(c.pts.total) : null;
                  return (
                    <tr key={c.email} className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-2.5 pr-3">
                        <div className="font-medium text-gray-900">{c.name || "—"}</div>
                        <div className="text-xs text-gray-500">{c.email}</div>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                            c.role === "admin"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {c.role}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-xs text-gray-500">
                        {new Date(c.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${c.inactivity.badgeClass}`}
                          >
                            <Clock className="size-3" />
                            {c.inactivity.label}
                          </span>
                          {c.last_login_at ? (
                            <span className="text-xs text-gray-400">
                              ({new Date(c.last_login_at).toLocaleDateString()})
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-2.5 pr-3">
                        {c.pts && level ? (
                          <span
                            className="inline-flex items-center gap-1.5"
                            title={`${c.pts.events} point-earning action${c.pts.events === 1 ? "" : "s"}`}
                          >
                            <span className="font-semibold tabular-nums text-gray-900">
                              {c.pts.total.toLocaleString()}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                LEVEL_STYLES[level] ?? LEVEL_STYLES.Explorer
                              }`}
                            >
                              {level}
                            </span>
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-right">
                        {resetTarget === c.email ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <input
                              type="password"
                              autoFocus
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="New password"
                              className="w-32 rounded border border-gray-300 bg-gray-100 px-1.5 py-1 text-xs outline-none focus:border-blue-600"
                            />
                            <button
                              type="button"
                              disabled={resetting || newPassword.length < 6}
                              onClick={() => submitReset(c.email)}
                              className="rounded bg-blue-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
                            >
                              Set
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setResetTarget(null);
                                setNewPassword("");
                              }}
                              className="rounded px-1.5 py-1 text-xs text-gray-500 hover:text-gray-700"
                            >
                              Cancel
                            </button>
                            <DeleteButton
                              email={c.email}
                              you={you}
                              deleting={deleting}
                              onDelete={deleteAccount}
                            />
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            {/* Send Nudge Button */}
                            <button
                              type="button"
                              onClick={() => openNudgeModal(c)}
                              className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50/70 px-2.5 py-1 text-xs font-medium text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-100"
                              title={`Send re-engagement email (${c.inactivity.days} days inactive)`}
                            >
                              <Mail className="size-3.5" />
                              Send Nudge
                            </button>

                            {/* Reset password */}
                            <button
                              type="button"
                              onClick={() => {
                                setResetTarget(c.email);
                                setResetMessage("");
                              }}
                              className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                            >
                              Reset
                            </button>

                            {/* Delete */}
                            <DeleteButton
                              email={c.email}
                              you={you}
                              deleting={deleting}
                              onDelete={deleteAccount}
                            />
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {customers && customers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      No registered customers found.
                    </td>
                  </tr>
                ) : null}
                {customers && customers.length > 0 && rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      No customers match the current filter or search query.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </AdminCard>

      {/* Re-engagement Nudge Modal */}
      {nudgeTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in-0">
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-xl border border-gray-200 bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
                  <Mail className="size-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Send Re-engagement Nudge
                  </h2>
                  <p className="text-xs text-gray-500">
                    To: <strong className="text-gray-700">{nudgeTarget.name || "Customer"}</strong> ({nudgeTarget.email})
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                  {nudgeTarget.last_login_at
                    ? `${getInactivityInfo(nudgeTarget).days} days inactive`
                    : `Never logged in (${getInactivityInfo(nudgeTarget).days}d)`}
                </span>
                <button
                  type="button"
                  onClick={() => setNudgeTarget(null)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50/70 px-6">
              <button
                type="button"
                onClick={() => setModalTab("compose")}
                className={`border-b-2 px-4 py-2.5 text-xs font-medium transition-colors ${
                  modalTab === "compose"
                    ? "border-blue-600 text-blue-700 font-semibold"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                Compose & Options
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalTab("preview");
                  refreshPreview();
                }}
                className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors ${
                  modalTab === "preview"
                    ? "border-blue-600 text-blue-700 font-semibold"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                <Eye className="size-3.5" />
                Live HTML Preview
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {nudgeSuccess ? (
                <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-800">
                  <Check className="size-5 shrink-0 text-emerald-600 mt-0.5" />
                  <div>
                    <p className="font-semibold">Email Delivered!</p>
                    <p className="mt-0.5 text-xs text-emerald-700">{nudgeSuccess}</p>
                  </div>
                </div>
              ) : null}

              {nudgeError ? (
                <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                  <AlertCircle className="size-5 shrink-0 text-rose-600 mt-0.5" />
                  <div>
                    <p className="font-semibold">Send Error</p>
                    <p className="mt-0.5 text-xs text-rose-700">{nudgeError}</p>
                  </div>
                </div>
              ) : null}

              {modalTab === "compose" ? (
                <div className="space-y-4">
                  {/* Inactivity Callout */}
                  <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3 text-xs text-blue-900 leading-relaxed">
                    <strong>Dynamic Calculation:</strong> The email body highlights{" "}
                    <span className="font-semibold underline">
                      &quot;It&apos;s been {getInactivityInfo(nudgeTarget).days} days since you{" "}
                      {nudgeTarget.last_login_at ? "last logged in" : "created your account"}&quot;
                    </span>
                    . It also lists curated platform features and concludes with a prominent{" "}
                    <strong>&quot;Log in now &rarr;&quot;</strong> action button.
                  </div>

                  {/* Subject Line */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700">Subject line</label>
                    <input
                      type="text"
                      value={nudgeSubject}
                      onChange={(e) => setNudgeSubject(e.target.value)}
                      placeholder="e.g. We miss you — it's been X days since your last Market Intelligence visit"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-xs outline-none focus:border-blue-600"
                    />
                  </div>

                  {/* Today's Market Update Note */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-gray-700">
                        Today&apos;s Market Update Note (hyperlinked in email)
                      </label>
                      <span className="text-[11px] text-gray-400">Pre-filled with today&apos;s intelligence</span>
                    </div>
                    <textarea
                      rows={3}
                      value={nudgeMarketUpdate}
                      onChange={(e) => setNudgeMarketUpdate(e.target.value)}
                      placeholder="Enter a brief note about today's market momentum, sector updates, or fresh features..."
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-xs outline-none focus:border-blue-600"
                    />
                  </div>

                  {/* Features Selection */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-gray-700">
                        Features Highlighted (all hyperlinked to live pages)
                      </label>
                      <span className="text-[11px] text-gray-400">
                        {selectedFeatureKeys.length} of {REENGAGEMENT_FEATURES.length} included
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {REENGAGEMENT_FEATURES.map((f) => {
                        const active = selectedFeatureKeys.includes(f.key);
                        return (
                          <div
                            key={f.key}
                            onClick={() => toggleFeature(f.key)}
                            className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 text-xs transition-colors ${
                              active
                                ? "border-blue-300 bg-blue-50/40 text-gray-900"
                                : "border-gray-200 bg-gray-50/50 text-gray-400"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={active}
                              onChange={() => toggleFeature(f.key)}
                              className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-gray-900">{f.title}</span>
                                <span className="text-[10px] font-bold uppercase text-blue-600">
                                  {f.badge}
                                </span>
                              </div>
                              <p className="mt-0.5 text-[11px] text-gray-500 line-clamp-1">
                                {f.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      Live preview of how the customer will see this email in their inbox:
                    </p>
                    <button
                      type="button"
                      onClick={refreshPreview}
                      disabled={previewLoading}
                      className="inline-flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <RefreshCw className={`size-3 ${previewLoading ? "animate-spin" : ""}`} />
                      Refresh Preview
                    </button>
                  </div>

                  {nudgePreviewHtml ? (
                    <iframe
                      title="Email live preview"
                      srcDoc={nudgePreviewHtml}
                      className="h-[460px] w-full rounded-lg border border-gray-200 bg-white shadow-inner"
                    />
                  ) : (
                    <div className="flex h-64 items-center justify-center rounded-lg border border-dashed text-xs text-gray-400">
                      {previewLoading ? "Rendering preview…" : "No preview available"}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-3.5">
              <button
                type="button"
                onClick={() => setNudgeTarget(null)}
                className="rounded-md border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {modalTab === "compose" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setModalTab("preview");
                      refreshPreview();
                    }}
                    className="rounded-md border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Preview HTML
                  </button>
                ) : null}

                <button
                  type="button"
                  disabled={sendingNudge || !nudgeSubject.trim()}
                  onClick={sendNudgeEmail}
                  className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  <Send className={`size-3.5 ${sendingNudge ? "animate-spin" : ""}`} />
                  {sendingNudge ? "Sending Nudge…" : "Send Nudge Now"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DeleteButton({
  email,
  you,
  deleting,
  onDelete,
}: {
  email: string;
  you: string;
  deleting: string | null;
  onDelete: (email: string) => void;
}) {
  if (you && email.toLowerCase() === you.toLowerCase()) {
    return <span className="px-2 py-1 text-xs text-gray-400">You</span>;
  }
  return (
    <button
      type="button"
      disabled={deleting === email}
      onClick={() => onDelete(email)}
      className="rounded px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 disabled:opacity-50"
    >
      {deleting === email ? "Deleting…" : "Delete"}
    </button>
  );
}
