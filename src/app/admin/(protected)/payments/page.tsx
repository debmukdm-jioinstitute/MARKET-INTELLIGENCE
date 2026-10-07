"use client";

import { AdminCard, AdminStat } from "@/components/admin/admin-card";
import Link from "next/link";
import { useEffect, useState } from "react";

type Order = {
  id: string;
  user_email: string;
  user_name: string | null;
  plan_id: string;
  amount_paise: number;
  amount_inr: number;
  status: string;
  payment_id: string | null;
  created_at: string | null;
  paid_at: string | null;
};

type Stats = {
  totalRevenuePaise: number;
  totalRevenueInr: number;
  paidCount: number;
  mrrEstimatePaise: number;
  mrrEstimateInr: number;
  byPlan: Record<string, { count: number; revenuePaise: number; revenueInr: number }>;
};

const PLAN_LABELS: Record<string, string> = {
  pro_monthly: "Plus · monthly",
  pro_annual: "Pro · annual",
  day_pass: "Day pass",
};

function inr(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export default function AdminPaymentsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [rows, setRows] = useState<Order[]>([]);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/admin/payments?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (!cancelled && res.ok) {
        setStats(json.stats);
        setRows(json.orders ?? []);
      }
      if (!cancelled) setLoading(false);
    }
    const t = setTimeout(load, q ? 300 : 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [status, q]);

  const plans = stats ? Object.entries(stats.byPlan) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Payments</h1>
        <p className="text-sm text-gray-500">Every Razorpay order — who paid, for what plan, and when.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <AdminStat label="Total revenue" value={stats ? inr(stats.totalRevenueInr) : "—"} />
        <AdminStat label="Paid orders" value={stats?.paidCount ?? "—"} />
        <AdminStat label="MRR estimate" value={stats ? inr(stats.mrrEstimateInr) : "—"} info="Paid Plus (30d) + Pro-annual/12" />
        <AdminStat label="Avg order" value={stats && stats.paidCount ? inr(stats.totalRevenueInr / stats.paidCount) : "—"} />
      </div>

      {plans.length > 0 ? (
        <AdminCard title="Revenue by plan">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {plans.map(([planId, p]) => (
              <div key={planId} className="rounded-md border border-gray-200 bg-white p-3">
                <div className="text-sm font-medium text-gray-900">{PLAN_LABELS[planId] ?? planId}</div>
                <div className="mt-1 text-lg font-semibold text-gray-900">{inr(p.revenueInr)}</div>
                <div className="text-xs text-gray-500">{p.count} paid orders</div>
              </div>
            ))}
          </div>
        </AdminCard>
      ) : null}

      <AdminCard
        title="Orders"
        subtitle="Click an email for the full user dossier."
        action={
          <div className="flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search email / payment id…"
              className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-gray-500"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm outline-none"
            >
              <option value="">All statuses</option>
              <option value="paid">Paid</option>
              <option value="created">Created</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        }
      >
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-gray-500">No orders match.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-2 pr-3 font-medium">Customer</th>
                  <th className="py-2 pr-3 font-medium">Plan</th>
                  <th className="py-2 pr-3 font-medium">Amount</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">Payment id</th>
                  <th className="py-2 pr-3 font-medium">Created</th>
                  <th className="py-2 font-medium">Paid</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="py-2.5 pr-3">
                      <Link
                        href={`/admin/users/${encodeURIComponent(o.user_email)}`}
                        className="font-medium text-gray-900 hover:underline"
                      >
                        {o.user_name || o.user_email}
                      </Link>
                      {o.user_name ? <div className="text-xs text-gray-500">{o.user_email}</div> : null}
                    </td>
                    <td className="py-2.5 pr-3 text-gray-700">{PLAN_LABELS[o.plan_id] ?? o.plan_id}</td>
                    <td className="py-2.5 pr-3 font-medium text-gray-900">{inr(o.amount_inr)}</td>
                    <td className="py-2.5 pr-3">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                          o.status === "paid"
                            ? "bg-emerald-50 text-emerald-700"
                            : o.status === "failed"
                              ? "bg-red-50 text-red-700"
                              : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-xs text-gray-500">{o.payment_id ?? "—"}</td>
                    <td className="py-2.5 pr-3 text-xs text-gray-500">
                      {o.created_at ? new Date(o.created_at).toLocaleString("en-IN") : "—"}
                    </td>
                    <td className="py-2.5 text-xs text-gray-500">
                      {o.paid_at ? new Date(o.paid_at).toLocaleString("en-IN") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </div>
  );
}
