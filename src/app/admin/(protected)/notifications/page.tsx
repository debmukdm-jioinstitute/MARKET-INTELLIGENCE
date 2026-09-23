"use client";

import { AdminCard, AdminStat } from "@/components/admin/admin-card";
import { useEffect, useState } from "react";

type Sent = { id: string; title: string; body: string; url: string | null; recipient_count: number; failure_count: number; created_at: string };

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<Sent[] | null>(null);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [pushConfigured, setPushConfigured] = useState(true);
  const [form, setForm] = useState({ title: "", body: "", url: "" });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  function load() {
    fetch("/api/admin/notifications")
      .then((r) => r.json())
      .then((json) => {
        setNotifications(json.notifications);
        setSubscriberCount(json.subscriberCount);
        setPushConfigured(json.pushConfigured);
      })
      .catch(() => {});
  }
  useEffect(load, []);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");
    setOk("");
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, url: form.url || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to send");
      setOk(`Sent to ${json.notification.recipient_count} subscriber(s), ${json.notification.failure_count} failure(s).`);
      setForm({ title: "", body: "", url: "" });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-blue-600">Push notifications</p>
        <h1 className="mt-1 text-xl font-semibold">Send a push notification</h1>
        <p className="mt-1 text-sm text-gray-500">Delivered to everyone who enabled notifications (bell icon in the main app&apos;s top bar).</p>
      </div>

      {!pushConfigured ? (
        <div className="rounded-lg border border-blue-600/30 bg-blue-600/5 p-3 text-sm text-blue-600">
          VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are not set — sending is disabled until they&apos;re added as environment variables.
        </div>
      ) : null}

      <AdminStat label="Active subscribers" value={subscriberCount} />

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {ok ? <p className="text-sm text-emerald-600">{ok}</p> : null}

      <AdminCard title="Compose">
        <form onSubmit={send} className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm text-gray-500">Title</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full rounded-md border border-gray-200 bg-gray-100 px-2.5 py-1.5 text-sm outline-none focus:border-blue-600"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-500">Body</label>
            <textarea
              required
              rows={2}
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              className="w-full rounded-md border border-gray-200 bg-gray-100 px-2.5 py-1.5 text-sm outline-none focus:border-blue-600"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-500">Link when clicked (optional, internal path)</label>
            <input
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              placeholder="/Home"
              className="w-full rounded-md border border-gray-200 bg-gray-100 px-2.5 py-1.5 text-sm outline-none focus:border-blue-600"
            />
          </div>
          <button
            type="submit"
            disabled={sending || !pushConfigured}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {sending ? "Sending…" : `Send to ${subscriberCount} subscriber(s)`}
          </button>
        </form>
      </AdminCard>

      <AdminCard title="History">
        <div className="space-y-2">
          {(notifications ?? []).map((n) => (
            <div key={n.id} className="rounded-md border border-gray-200 p-3 text-sm">
              <p className="font-medium text-gray-900">{n.title}</p>
              <p className="text-sm text-gray-500">{n.body}</p>
              <p className="mt-1 text-sm text-gray-500">
                {new Date(n.created_at).toLocaleString()} · {n.recipient_count} sent, {n.failure_count} failed
              </p>
            </div>
          ))}
          {notifications && notifications.length === 0 ? <p className="text-sm text-gray-500">No notifications sent yet.</p> : null}
        </div>
      </AdminCard>
    </div>
  );
}
