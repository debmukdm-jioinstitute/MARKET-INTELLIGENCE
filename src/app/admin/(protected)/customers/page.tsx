"use client";

import { AdminCard, AdminStat } from "@/components/admin/admin-card";
import { useEffect, useMemo, useState } from "react";

type Customer = { email: string; name: string; role: "user" | "admin"; created_at: string; last_login_at: string | null };
type LeaderboardEntry = { email: string; name: string; total: number; level: string; events: number; last_event_at: string | null };

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

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [points, setPoints] = useState<Record<string, LeaderboardEntry> | null>(null);
  const [pointsError, setPointsError] = useState("");
  const [pointsSort, setPointsSort] = useState<"desc" | "asc">("desc");
  const [you, setYou] = useState("");
  const [error, setError] = useState("");
  const [resetTarget, setResetTarget] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

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

  const rows = useMemo(() => {
    const list = (customers ?? []).map((c) => ({
      ...c,
      pts: points?.[c.email.toLowerCase()] ?? null,
    }));
    const total = (r: { pts: LeaderboardEntry | null }) => r.pts?.total ?? 0;
    list.sort((a, b) => (pointsSort === "desc" ? total(b) - total(a) : total(a) - total(b)));
    return list;
  }, [customers, points, pointsSort]);

  const totalCustomers = customers?.length ?? 0;
  const withPoints = rows.filter((r) => (r.pts?.total ?? 0) > 0).length;
  const totalPoints = rows.reduce((s, r) => s + (r.pts?.total ?? 0), 0);
  const avgActive = withPoints > 0 ? Math.round(totalPoints / withPoints) : null;

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
    setError("");
    setResetMessage("");
    try {
      const res = await fetch("/api/admin/customers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to delete account");
      setResetMessage(`Deleted ${email}.`);
      setResetTarget((t) => (t === email ? null : t));
      setCustomers((list) => (list ? list.filter((c) => c.email !== email) : list));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete account");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mt-1 text-xl font-semibold">Registered customers</h1>
        <p className="mt-1 text-sm text-gray-500">
          {customers ? `${customers.length} account${customers.length === 1 ? "" : "s"}` : "Loading…"}
        </p>
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {resetMessage ? <p className="text-sm text-emerald-600">{resetMessage}</p> : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <AdminStat label="Total customers" value={customers ? totalCustomers : "…"} />
        <AdminStat label="Customers with points" value={points ? withPoints : "—"} />
        <AdminStat label="Total points awarded" value={points ? totalPoints.toLocaleString() : "—"} />
        <AdminStat
          label="Average per active customer"
          value={points ? (avgActive === null ? "—" : avgActive.toLocaleString()) : "—"}
        />
      </div>

      <AdminCard
        title="All accounts"
        subtitle={
          pointsError
            ? "Gamified points are unavailable right now — the customer list below is unaffected."
            : points
              ? "Click the Points column header to switch between highest and lowest first."
              : "Loading points…"
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="py-2 pr-3 font-medium">Email</th>
                <th className="py-2 pr-3 font-medium">Name</th>
                <th className="py-2 pr-3 font-medium">Role</th>
                <th className="py-2 pr-3 font-medium">Joined</th>
                <th className="py-2 pr-3 font-medium">Last login</th>
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
                <th className="py-2 pr-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const level = c.pts ? c.pts.level || levelFor(c.pts.total) : null;
                return (
                  <tr key={c.email} className="border-b border-gray-100">
                    <td className="py-1.5 pr-3 text-gray-800">{c.email}</td>
                    <td className="py-1.5 pr-3 text-gray-700">{c.name}</td>
                    <td className="py-1.5 pr-3">
                      <span className={c.role === "admin" ? "text-blue-600" : "text-gray-500"}>{c.role}</span>
                    </td>
                    <td className="py-1.5 pr-3 text-gray-500">{new Date(c.created_at).toLocaleDateString()}</td>
                    <td className="py-1.5 pr-3 text-gray-500">
                      {c.last_login_at ? new Date(c.last_login_at).toLocaleString() : "—"}
                    </td>
                    <td className="py-1.5 pr-3">
                      {c.pts && level ? (
                        <span
                          className="inline-flex items-center gap-1.5"
                          title={`${c.pts.events} point-earning action${c.pts.events === 1 ? "" : "s"}`}
                        >
                          <span className="font-semibold tabular-nums text-gray-900">
                            {c.pts.total.toLocaleString()}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${LEVEL_STYLES[level] ?? LEVEL_STYLES.Explorer}`}
                          >
                            {level}
                          </span>
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-1.5 pr-3">
                      {resetTarget === c.email ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="password"
                            autoFocus
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="New password"
                            className="w-32 rounded border border-gray-300 bg-gray-100 px-1.5 py-1 text-sm outline-none focus:border-blue-600"
                          />
                          <button
                            type="button"
                            disabled={resetting || newPassword.length < 6}
                            onClick={() => submitReset(c.email)}
                            className="rounded bg-blue-600 px-2 py-1 text-sm font-semibold text-white disabled:opacity-50"
                          >
                            Set
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setResetTarget(null);
                              setNewPassword("");
                            }}
                            className="rounded px-1.5 py-1 text-sm text-gray-500 hover:text-gray-700"
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
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setResetTarget(c.email);
                              setResetMessage("");
                            }}
                            className="rounded px-2 py-1 text-sm text-gray-500 hover:bg-gray-200 hover:text-gray-800"
                          >
                            Reset password
                          </button>
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
                  <td colSpan={7} className="py-6 text-center text-gray-500">
                    No registered customers yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </AdminCard>
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
    return <span className="px-2 py-1 text-sm text-gray-400">You</span>;
  }
  return (
    <button
      type="button"
      disabled={deleting === email}
      onClick={() => onDelete(email)}
      className="rounded px-2 py-1 text-sm text-rose-600 hover:bg-rose-50 disabled:opacity-50"
    >
      {deleting === email ? "Deleting…" : "Delete"}
    </button>
  );
}
