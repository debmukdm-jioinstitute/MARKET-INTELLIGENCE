"use client";

import { AdminCard, AdminStat } from "@/components/admin/admin-card";
import Link from "next/link";
import { useEffect, useState } from "react";

type Referral = {
  referrer_email: string;
  referrer_name: string | null;
  referee_email: string;
  referee_name: string | null;
  referral_code: string;
  status: string;
  created_at: string | null;
  converted_at: string | null;
};

type Stats = {
  codesIssued: number;
  totalReferred: number;
  pending: number;
  converted: number;
  conversionRate: number;
};

function dossier(email: string) {
  return `/admin/users/${encodeURIComponent(email)}`;
}

export default function AdminReferralsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [rows, setRows] = useState<Referral[]>([]);
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
      const res = await fetch(`/api/admin/referrals?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (!cancelled && res.ok) {
        setStats(json.stats);
        setRows(json.referrals ?? []);
      }
      if (!cancelled) setLoading(false);
    }
    const t = setTimeout(load, q ? 300 : 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [status, q]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Referrals</h1>
        <p className="text-sm text-gray-500">Every referral code, signup and conversion — who referred whom.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <AdminStat label="Codes issued" value={stats?.codesIssued ?? "—"} />
        <AdminStat label="Friends referred" value={stats?.totalReferred ?? "—"} />
        <AdminStat label="Pending" value={stats?.pending ?? "—"} />
        <AdminStat label="Converted" value={stats?.converted ?? "—"} />
        <AdminStat label="Conversion rate" value={stats ? `${stats.conversionRate}%` : "—"} />
      </div>

      <AdminCard
        title="All referrals"
        subtitle="Filter by status or search either email. Click an email for the full user dossier."
        action={
          <div className="flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search email…"
              className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-gray-500"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm outline-none"
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="converted">Converted</option>
            </select>
          </div>
        }
      >
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-gray-500">No referrals yet. Codes are issued when a user opens their referral card.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-2 pr-3 font-medium">Referrer</th>
                  <th className="py-2 pr-3 font-medium">Referee</th>
                  <th className="py-2 pr-3 font-medium">Code</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">Joined</th>
                  <th className="py-2 font-medium">Converted</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.referee_email} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="py-2.5 pr-3">
                      <Link href={dossier(r.referrer_email)} className="font-medium text-gray-900 hover:underline">
                        {r.referrer_name || r.referrer_email}
                      </Link>
                      {r.referrer_name ? <div className="text-xs text-gray-500">{r.referrer_email}</div> : null}
                    </td>
                    <td className="py-2.5 pr-3">
                      <Link href={dossier(r.referee_email)} className="font-medium text-gray-900 hover:underline">
                        {r.referee_name || r.referee_email}
                      </Link>
                      {r.referee_name ? <div className="text-xs text-gray-500">{r.referee_email}</div> : null}
                    </td>
                    <td className="py-2.5 pr-3 text-xs text-gray-600">{r.referral_code}</td>
                    <td className="py-2.5 pr-3">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                          r.status === "converted"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {r.status === "converted" ? "+1 month earned" : "Joined"}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-xs text-gray-500">
                      {r.created_at ? new Date(r.created_at).toLocaleString("en-IN") : "—"}
                    </td>
                    <td className="py-2.5 text-xs text-gray-500">
                      {r.converted_at ? new Date(r.converted_at).toLocaleString("en-IN") : "—"}
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
