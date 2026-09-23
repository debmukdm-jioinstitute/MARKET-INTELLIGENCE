"use client";

import { AdminCard } from "@/components/admin/admin-card";
import { useEffect, useState } from "react";

type Customer = { email: string; name: string; role: "user" | "admin"; created_at: string; last_login_at: string | null };

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [error, setError] = useState("");
  const [resetTarget, setResetTarget] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState("");

  function load() {
    fetch("/api/admin/customers")
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error ?? "Failed to load customers");
        setCustomers(json.customers);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load customers"));
  }
  useEffect(load, []);

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

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-blue-600">Customers</p>
        <h1 className="mt-1 text-xl font-semibold">Registered customers</h1>
        <p className="mt-1 text-sm text-gray-500">
          {customers ? `${customers.length} account${customers.length === 1 ? "" : "s"}` : "Loading…"}
        </p>
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {resetMessage ? <p className="text-sm text-emerald-600">{resetMessage}</p> : null}

      <AdminCard title="All accounts">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="py-2 pr-3 font-medium">Email</th>
                <th className="py-2 pr-3 font-medium">Name</th>
                <th className="py-2 pr-3 font-medium">Role</th>
                <th className="py-2 pr-3 font-medium">Joined</th>
                <th className="py-2 pr-3 font-medium">Last login</th>
                <th className="py-2 pr-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {(customers ?? []).map((c) => (
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
                      </div>
                    ) : (
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
                    )}
                  </td>
                </tr>
              ))}
              {customers && customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-500">
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
