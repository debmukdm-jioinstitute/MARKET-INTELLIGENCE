"use client";

import { AdminCard, AdminStat } from "@/components/admin/admin-card";
import { useEffect, useState } from "react";
import Link from "next/link";

type Stats = {
  customers: number;
  documents: number;
  notificationsSent: number;
  newslettersSent: number;
  pageviews7d: number;
  dbConfigured: boolean;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-400">Overview</p>
        <h1 className="mt-1 text-xl font-semibold">Admin dashboard</h1>
      </div>

      {stats && !stats.dbConfigured ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-300">
          No database configured (DATABASE_URL / POSTGRES_URL unset) — customer accounts, tabs, updates, notifications, and the
          knowledge base all need it. Add a Neon Postgres connection string in Vercel → Project → Settings → Environment
          Variables.
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <AdminStat label="Registered customers" value={stats?.customers ?? "—"} />
        <AdminStat label="Knowledge base docs" value={stats?.documents ?? "—"} />
        <AdminStat label="Push notifications sent" value={stats?.notificationsSent ?? "—"} />
        <AdminStat label="Newsletters sent" value={stats?.newslettersSent ?? "—"} />
        <AdminStat label="Pageviews (7d)" value={stats?.pageviews7d ?? "—"} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <AdminCard title="Get started">
          <ul className="space-y-2 text-sm text-neutral-300">
            <li>
              <Link href="/admin/tabs" className="text-amber-400 hover:underline">
                Add a new tab
              </Link>{" "}
              to the main app&apos;s sidebar — it appears live, no deploy needed.
            </li>
            <li>
              <Link href="/admin/updates" className="text-amber-400 hover:underline">
                Publish an update
              </Link>{" "}
              banner that shows in the main app.
            </li>
            <li>
              <Link href="/admin/knowledge-base" className="text-amber-400 hover:underline">
                Feed documents
              </Link>{" "}
              into the knowledge base for the RAG assistant.
            </li>
            <li>
              <Link href="/admin/newsletters" className="text-amber-400 hover:underline">
                Compose a newsletter
              </Link>{" "}
              to send to every registered customer.
            </li>
          </ul>
        </AdminCard>
        <AdminCard title="Environment checklist" subtitle="Set these in Vercel → Project → Settings → Environment Variables">
          <ul className="space-y-1.5 font-mono text-xs text-neutral-400">
            <li>DATABASE_URL — Neon Postgres (customers, tabs, updates, RAG, analytics)</li>
            <li>ADMIN_EMAILS — comma-separated emails granted admin role</li>
            <li>RESEND_API_KEY — required to send newsletters</li>
            <li>VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY — required for push notifications</li>
            <li>GROQ_API_KEY — required for the RAG assistant&apos;s answers</li>
          </ul>
        </AdminCard>
      </div>
    </div>
  );
}
