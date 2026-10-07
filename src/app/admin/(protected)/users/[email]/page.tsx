"use client";

import { AdminCard, AdminStat } from "@/components/admin/admin-card";
import Link from "next/link";
import { use, useEffect, useState } from "react";

type Dossier = {
  user: {
    email: string;
    name: string;
    role: string;
    created_at: string | null;
    last_login_at: string | null;
    pro_plan: string | null;
    pro_expires_at: string | null;
    referral_code: string | null;
    referred_by: string | null;
  };
  xp: { total: number; level: string; events: number; last_event_at: string | null; streak: number; streak_start: string | null };
  byAction: { action: string; points: number; events: number; last_at: string | null }[];
  recent: { action: string; points: number; page: string | null; created_at: string | null }[];
  engagement: { day: string; minutes: number }[];
  highlights: {
    redemptions: { action: string; points: number; events: number; last_at: string | null }[];
    referralEvents: { action: string; points: number; events: number; last_at: string | null }[];
  };
  referralsMade: { referee_email: string; status: string; created_at: string | null; converted_at: string | null }[];
  orders: {
    id: string;
    plan_id: string;
    amount_paise: number;
    status: string;
    payment_id: string | null;
    created_at: string | null;
    paid_at: string | null;
  }[];
};

function fmtDate(d: string | null) {
  return d ? new Date(d).toLocaleString("en-IN") : "—";
}

function EngagementBars({ days }: { days: { day: string; minutes: number }[] }) {
  const byDay = new Map(days.map((d) => [d.day.slice(0, 10), d.minutes]));
  const cells: { date: Date; minutes: number }[] = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    cells.push({ date: d, minutes: byDay.get(key) ?? 0 });
  }
  const max = Math.max(60, ...cells.map((c) => c.minutes));
  return (
    <div>
      <div className="flex h-28 items-end gap-1">
        {cells.map((c, i) => (
          <div
            key={i}
            title={`${c.date.toLocaleDateString("en-IN")}: ${c.minutes} min`}
            className={`flex-1 rounded-t ${c.minutes >= 10 ? "bg-gray-900" : c.minutes >= 5 ? "bg-gray-500" : c.minutes > 0 ? "bg-gray-300" : "bg-gray-100"}`}
            style={{ height: `${Math.max(4, (c.minutes / max) * 100)}%` }}
          />
        ))}
      </div>
      <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded bg-gray-900" /> 10+ min</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded bg-gray-500" /> 5–9 min</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded bg-gray-300" /> 1–4 min</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded bg-gray-100" /> none</span>
      </div>
    </div>
  );
}

export default function AdminUserDossierPage({ params }: { params: Promise<{ email: string }> }) {
  const { email } = use(params);
  const decoded = decodeURIComponent(email);
  const [d, setD] = useState<Dossier | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/admin/users/xp-detail?email=${encodeURIComponent(decoded)}`, { cache: "no-store" });
      const json = await res.json();
      if (!cancelled) {
        if (res.ok) setD(json);
        else setError(json.error ?? "Failed to load dossier");
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [decoded]);

  if (loading) return <p className="text-sm text-gray-500">Loading dossier…</p>;
  if (error || !d)
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">{error || "Not found"}</p>
        <Link href="/admin/customers" className="text-sm text-gray-700 underline underline-offset-2">
          ← Back to customers
        </Link>
      </div>
    );

  const u = d.user;
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{u.name || "—"}</h1>
          <p className="text-sm text-gray-500">{u.email}</p>
        </div>
        <Link href="/admin/customers" className="text-sm text-gray-700 underline underline-offset-2">
          ← Customers
        </Link>
      </div>

      <AdminCard title="Profile">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
          <div><dt className="text-xs uppercase tracking-wide text-gray-500">Role</dt><dd className="font-medium text-gray-900">{u.role}</dd></div>
          <div><dt className="text-xs uppercase tracking-wide text-gray-500">Plan</dt><dd className="font-medium text-gray-900">{u.pro_plan ?? "Free"}</dd></div>
          <div><dt className="text-xs uppercase tracking-wide text-gray-500">Plan expires</dt><dd className="font-medium text-gray-900">{fmtDate(u.pro_expires_at)}</dd></div>
          <div><dt className="text-xs uppercase tracking-wide text-gray-500">Referral code</dt><dd className="font-medium text-gray-900">{u.referral_code ?? "—"}</dd></div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Referred by</dt>
            <dd className="font-medium text-gray-900">
              {u.referred_by ? (
                <Link href={`/admin/users/${encodeURIComponent(u.referred_by)}`} className="hover:underline">
                  {u.referred_by}
                </Link>
              ) : "—"}
            </dd>
          </div>
          <div><dt className="text-xs uppercase tracking-wide text-gray-500">Joined</dt><dd className="font-medium text-gray-900">{fmtDate(u.created_at)}</dd></div>
          <div><dt className="text-xs uppercase tracking-wide text-gray-500">Last login</dt><dd className="font-medium text-gray-900">{fmtDate(u.last_login_at)}</dd></div>
        </dl>
      </AdminCard>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <AdminStat label="Total XP" value={d.xp.total.toLocaleString("en-IN")} />
        <AdminStat label="Level" value={d.xp.level} />
        <AdminStat label="XP events" value={d.xp.events} />
        <AdminStat label="Day streak" value={d.xp.streak} />
        <AdminStat label="Last XP event" value={d.xp.last_event_at ? new Date(d.xp.last_event_at).toLocaleDateString("en-IN") : "—"} />
      </div>

      {(d.highlights.redemptions.length > 0 || d.highlights.referralEvents.length > 0) && (
        <AdminCard title="Highlights" subtitle="Redemptions and referral bonuses stand out here.">
          <div className="space-y-2 text-sm">
            {d.highlights.redemptions.map((r) => (
              <div key={r.action} className="rounded border border-gray-200 bg-white px-3 py-2">
                <span className="font-medium text-gray-900">Redeemed Plus:</span>{" "}
                <span className="text-gray-700">{r.events}× {r.points} XP</span>
                <span className="text-gray-500"> · last {fmtDate(r.last_at)}</span>
              </div>
            ))}
            {d.highlights.referralEvents.map((r) => (
              <div key={r.action} className="rounded border border-gray-200 bg-white px-3 py-2">
                <span className="font-medium text-gray-900">{r.action}:</span>{" "}
                <span className="text-gray-700">+{r.points} XP over {r.events} events</span>
              </div>
            ))}
          </div>
        </AdminCard>
      )}

      <AdminCard title="Engagement — last 30 days" subtitle="Active minutes per day (IST).">
        <EngagementBars days={d.engagement} />
      </AdminCard>

      <AdminCard title="XP by action">
        {d.byAction.length === 0 ? (
          <p className="text-sm text-gray-500">No XP events yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-2 pr-3 font-medium">Action</th>
                  <th className="py-2 pr-3 font-medium">XP</th>
                  <th className="py-2 pr-3 font-medium">Events</th>
                  <th className="py-2 font-medium">Last</th>
                </tr>
              </thead>
              <tbody>
                {d.byAction.map((b) => (
                  <tr key={b.action} className="border-b border-gray-100">
                    <td className="py-2 pr-3 text-xs text-gray-800">{b.action}</td>
                    <td className={`py-2 pr-3 font-medium ${b.points < 0 ? "text-red-600" : "text-gray-900"}`}>
                      {b.points > 0 ? "+" : ""}{b.points.toLocaleString("en-IN")}
                    </td>
                    <td className="py-2 pr-3 text-gray-600">{b.events}</td>
                    <td className="py-2 text-xs text-gray-500">{fmtDate(b.last_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AdminCard title="Referrals made" subtitle={`${d.referralsMade.length} total`}>
          {d.referralsMade.length === 0 ? (
            <p className="text-sm text-gray-500">None yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {d.referralsMade.map((r) => (
                <li key={r.referee_email} className="flex items-center justify-between gap-2">
                  <Link href={`/admin/users/${encodeURIComponent(r.referee_email)}`} className="text-gray-900 hover:underline">
                    {r.referee_email}
                  </Link>
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${r.status === "converted" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                    {r.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>

        <AdminCard title="Orders" subtitle={`${d.orders.length} total`}>
          {d.orders.length === 0 ? (
            <p className="text-sm text-gray-500">No orders.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {d.orders.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-2">
                  <span className="text-gray-900">{o.plan_id} · ₹{(o.amount_paise / 100).toLocaleString("en-IN")}</span>
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${o.status === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                    {o.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>
      </div>

      <AdminCard title="Recent XP events" subtitle="Latest 50">
        {d.recent.length === 0 ? (
          <p className="text-sm text-gray-500">No events.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-2 pr-3 font-medium">When</th>
                  <th className="py-2 pr-3 font-medium">Action</th>
                  <th className="py-2 pr-3 font-medium">XP</th>
                  <th className="py-2 font-medium">Page</th>
                </tr>
              </thead>
              <tbody>
                {d.recent.map((e, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-2 pr-3 text-xs text-gray-500">{fmtDate(e.created_at)}</td>
                    <td className="py-2 pr-3 text-xs text-gray-800">{e.action}</td>
                    <td className={`py-2 pr-3 font-medium ${e.points < 0 ? "text-red-600" : "text-gray-900"}`}>
                      {e.points > 0 ? "+" : ""}{e.points}
                    </td>
                    <td className="py-2 text-xs text-gray-500">{e.page ?? "—"}</td>
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
