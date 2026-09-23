"use client";

import { AdminCard, AdminStat } from "@/components/admin/admin-card";
import { useEffect, useState } from "react";

type Newsletter = { id: string; subject: string; status: "draft" | "sent"; sent_at: string | null; recipient_count: number | null; created_at: string };

export default function AdminNewslettersPage() {
  const [newsletters, setNewsletters] = useState<Newsletter[] | null>(null);
  const [recipientCount, setRecipientCount] = useState(0);
  const [emailConfigured, setEmailConfigured] = useState(true);
  const [form, setForm] = useState({ subject: "", html: "" });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  function load() {
    fetch("/api/admin/newsletters")
      .then((r) => r.json())
      .then((json) => {
        setNewsletters(json.newsletters);
        setRecipientCount(json.recipientCount);
        setEmailConfigured(json.emailConfigured);
      })
      .catch(() => {});
  }
  useEffect(load, []);

  async function submit(mode: "draft" | "send") {
    setSending(true);
    setError("");
    setOk("");
    try {
      const res = await fetch("/api/admin/newsletters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, mode }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save");
      setOk(mode === "draft" ? "Draft saved." : `Sent to ${json.sent} customer(s), ${json.failed} failed.`);
      setForm({ subject: "", html: "" });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-blue-600">Newsletters</p>
        <h1 className="mt-1 text-xl font-semibold">Compose a newsletter</h1>
        <p className="mt-1 text-sm text-gray-500">Sends one HTML email to every registered customer via Resend.</p>
      </div>

      {!emailConfigured ? (
        <div className="rounded-lg border border-blue-600/30 bg-blue-600/5 p-3 text-sm text-blue-600">
          RESEND_API_KEY is not set — sending is disabled until it&apos;s added as an environment variable. Get a free key at{" "}
          <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="underline">
            resend.com
          </a>
          .
        </div>
      ) : null}

      <AdminStat label="Registered recipients" value={recipientCount} />

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {ok ? <p className="text-sm text-emerald-600">{ok}</p> : null}

      <AdminCard title="Compose" subtitle="HTML body — write raw HTML or simple paragraphs">
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm text-gray-500">Subject</label>
            <input
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              className="w-full rounded-md border border-gray-200 bg-gray-100 px-2.5 py-1.5 text-sm outline-none focus:border-blue-600"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-500">Body (HTML)</label>
            <textarea
              rows={10}
              value={form.html}
              onChange={(e) => setForm((f) => ({ ...f, html: e.target.value }))}
              placeholder="<h1>This week in markets</h1><p>...</p>"
              className="w-full rounded-md border border-gray-200 bg-gray-100 px-2.5 py-1.5 text-sm outline-none focus:border-blue-600"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={sending || !form.subject || !form.html}
              onClick={() => submit("draft")}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              Save draft
            </button>
            <button
              type="button"
              disabled={sending || !emailConfigured || !form.subject || !form.html}
              onClick={() => submit("send")}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {sending ? "Sending…" : `Send to ${recipientCount} customer(s)`}
            </button>
          </div>
        </div>
      </AdminCard>

      <AdminCard title="History">
        <div className="space-y-1.5">
          {(newsletters ?? []).map((n) => (
            <div key={n.id} className="flex items-center justify-between border-b border-gray-100 py-1.5 text-sm">
              <span className="truncate text-gray-800">{n.subject}</span>
              <span className="shrink-0 text-sm text-gray-500">
                {n.status === "sent" ? `Sent to ${n.recipient_count} · ${new Date(n.sent_at!).toLocaleString()}` : "Draft"}
              </span>
            </div>
          ))}
          {newsletters && newsletters.length === 0 ? <p className="text-sm text-gray-500">No newsletters yet.</p> : null}
        </div>
      </AdminCard>
    </div>
  );
}
