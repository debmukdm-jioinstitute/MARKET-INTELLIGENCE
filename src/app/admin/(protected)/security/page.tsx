"use client";

import { AdminCard, AdminStat } from "@/components/admin/admin-card";
import Link from "next/link";
import { useEffect, useState } from "react";

type Flag = {
  user_email: string;
  type: string;
  severity: "low" | "medium" | "high";
  reason: string;
  evidence: Record<string, unknown>;
};

const SEVERITY_STYLES: Record<string, string> = {
  high: "bg-red-50 text-red-700 border-red-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-gray-100 text-gray-600 border-gray-200",
};

const TYPE_LABELS: Record<string, string> = {
  xp_velocity: "XP velocity spike",
  heartbeat_farming: "Heartbeat farming",
  referral_ring: "Referral ring",
  self_referral_attempt: "Self-referral attempt",
  duplicate_accounts: "Duplicate accounts",
  redemption_burst: "Redemption burst",
};

const RULE_NOTES: [string, string][] = [
  ["XP velocity spike", "A user's single-day XP exceeds 3× their 30-day daily mean AND 100 XP, with ≥5 active days."],
  ["Heartbeat farming", "≥5 days pinned at the 60-minute engagement cap with zero feature-usage XP — suggests an idle open tab."],
  ["Referral ring", "Referral chains (A→B→C) or ≥3 referees of one referrer joining within 60 minutes."],
  ["Self-referral attempt", "Referee's email is a separator/digit variant of the referrer's own email identity."],
  ["Duplicate accounts", "≥2 accounts with the same normalized name created within 24 hours of each other."],
  ["Redemption burst", "≥2 Plus-plan XP redemptions within 7 days by one user."],
];

export default function AdminSecurityPage() {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [counts, setCounts] = useState({ high: 0, medium: 0, low: 0 });
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [severity, setSeverity] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await fetch("/api/admin/security/flags", { cache: "no-store" });
      const json = await res.json();
      if (!cancelled && res.ok) {
        setFlags(json.flags ?? []);
        setCounts(json.counts ?? { high: 0, medium: 0, low: 0 });
        setGeneratedAt(json.generated_at ?? null);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = severity ? flags.filter((f) => f.severity === severity) : flags;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Security flags</h1>
        <p className="text-sm text-gray-500">
          Automated abuse detection across XP, referrals and accounts. Rules re-run every 15 minutes.
          {generatedAt ? ` Last run: ${new Date(generatedAt).toLocaleString("en-IN")}.` : ""}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <AdminStat label="High severity" value={counts.high} />
        <AdminStat label="Medium severity" value={counts.medium} />
        <AdminStat label="Low severity" value={counts.low} />
      </div>

      <AdminCard
        title="Flags"
        subtitle="Click a user for their full dossier. Evidence expands inline."
        action={
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm outline-none"
          >
            <option value="">All severities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        }
      >
        {loading ? (
          <p className="text-sm text-gray-500">Running checks…</p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-gray-500">No flags. The platform looks clean.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-2 pr-3 font-medium">Severity</th>
                  <th className="py-2 pr-3 font-medium">Rule</th>
                  <th className="py-2 pr-3 font-medium">User</th>
                  <th className="py-2 pr-3 font-medium">Reason</th>
                  <th className="py-2 font-medium">Evidence</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((f, i) => (
                  <tr key={`${f.type}-${f.user_email}-${i}`} className="border-b border-gray-100 hover:bg-gray-50/50 align-top">
                    <td className="py-2.5 pr-3">
                      <span className={`inline-block rounded border px-2 py-0.5 text-xs font-medium ${SEVERITY_STYLES[f.severity]}`}>
                        {f.severity}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 font-medium text-gray-900">{TYPE_LABELS[f.type] ?? f.type}</td>
                    <td className="py-2.5 pr-3">
                      <Link href={`/admin/users/${encodeURIComponent(f.user_email)}`} className="text-gray-900 hover:underline">
                        {f.user_email}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-3 text-gray-700">{f.reason}</td>
                    <td className="py-2.5">
                      <button
                        onClick={() => setExpanded(expanded === i ? null : i)}
                        className="text-xs font-medium text-gray-600 underline underline-offset-2"
                      >
                        {expanded === i ? "Hide" : "Show"}
                      </button>
                      {expanded === i ? (
                        <pre className="mt-2 max-w-md overflow-x-auto rounded bg-gray-100 p-2 text-xs text-gray-700">
                          {JSON.stringify(f.evidence, null, 2)}
                        </pre>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      <AdminCard title="How these rules work" subtitle="SQL-driven heuristics over the last 30 days.">
        <ul className="space-y-2 text-sm text-gray-700">
          {RULE_NOTES.map(([label, note]) => (
            <li key={label}>
              <span className="font-medium text-gray-900">{label}:</span> {note}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-gray-500">
          Flags are indicators, not verdicts — review the user dossier before acting.
        </p>
      </AdminCard>
    </div>
  );
}
