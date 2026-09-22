"use client";

import { AdminCard } from "@/components/admin/admin-card";
import { useEffect, useState } from "react";

type Customer = { email: string; name: string; role: "user" | "admin"; created_at: string; last_login_at: string | null };

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/customers")
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error ?? "Failed to load customers");
        setCustomers(json.customers);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load customers"));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-400">Customers</p>
        <h1 className="mt-1 text-xl font-semibold">Registered customers</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {customers ? `${customers.length} account${customers.length === 1 ? "" : "s"}` : "Loading…"}
        </p>
      </div>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      <AdminCard title="All accounts">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-neutral-800 text-left text-neutral-500">
                <th className="py-2 pr-3 font-medium">Email</th>
                <th className="py-2 pr-3 font-medium">Name</th>
                <th className="py-2 pr-3 font-medium">Role</th>
                <th className="py-2 pr-3 font-medium">Joined</th>
                <th className="py-2 pr-3 font-medium">Last login</th>
              </tr>
            </thead>
            <tbody>
              {(customers ?? []).map((c) => (
                <tr key={c.email} className="border-b border-neutral-900">
                  <td className="py-1.5 pr-3 font-mono text-neutral-200">{c.email}</td>
                  <td className="py-1.5 pr-3 text-neutral-300">{c.name}</td>
                  <td className="py-1.5 pr-3">
                    <span className={c.role === "admin" ? "text-amber-400" : "text-neutral-400"}>{c.role}</span>
                  </td>
                  <td className="py-1.5 pr-3 text-neutral-400">{new Date(c.created_at).toLocaleDateString()}</td>
                  <td className="py-1.5 pr-3 text-neutral-400">
                    {c.last_login_at ? new Date(c.last_login_at).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
              {customers && customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-neutral-500">
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
