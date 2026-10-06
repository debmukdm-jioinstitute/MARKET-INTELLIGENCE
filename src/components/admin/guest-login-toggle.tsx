"use client";

import { AdminCard } from "@/components/admin/admin-card";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type GuestLoginState = {
  guestLoginEnabled: boolean;
  envForceRequireAccount: boolean;
  dbConfigured: boolean;
};

export function GuestLoginToggle({ compact }: { compact?: boolean }) {
  const [state, setState] = useState<GuestLoginState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    fetch("/api/admin/guest-login", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j.error) setError(j.error);
        else {
          setError("");
          setState(j as GuestLoginState);
        }
      })
      .catch(() => setError("Failed to load guest login status"));
  }, []);

  useEffect(() => {
    load();
    const id = window.setInterval(load, 8_000);
    return () => window.clearInterval(id);
  }, [load]);

  async function setGuestLoginEnabled(enabled: boolean) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/guest-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestLoginEnabled: enabled }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(typeof j.error === "string" ? j.error : "Update failed");
        return;
      }
      setState((s) =>
        s
          ? { ...s, guestLoginEnabled: Boolean(j.guestLoginEnabled) }
          : { guestLoginEnabled: Boolean(j.guestLoginEnabled), envForceRequireAccount: false, dbConfigured: true },
      );
    } finally {
      setBusy(false);
    }
  }

  const enabled = state?.guestLoginEnabled ?? false;
  const blockedByEnv = Boolean(state?.envForceRequireAccount);

  const body = (
    <>
      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
      {!state?.dbConfigured ? (
        <p className="text-sm text-amber-800">
          Connect <code className="text-xs">DATABASE_URL</code> to persist this switch, or use{" "}
          <Link href="/admin/system" className="text-blue-600 hover:underline">
            System
          </Link>
          .
        </p>
      ) : blockedByEnv ? (
        <p className="text-sm text-amber-800">
          Guest login is forced off by <code className="text-xs">MI_REQUIRE_ACCOUNT</code> in Vercel. Remove it to use this
          toggle.
        </p>
      ) : (
        <label className="flex cursor-pointer items-center justify-between gap-4 text-sm text-gray-900">
          <span>
            <span className="font-medium">{enabled ? "Guest login ON" : "Guest login OFF"}</span>
            <span className="mt-0.5 block text-gray-500">
              {enabled
                ? "Bots and visitors can POST /api/auth/session with guest:true — no email or password."
                : "Login and signup required. Active guest cookies clear on the next request."}
            </span>
          </span>
          <input
            type="checkbox"
            className="h-5 w-5 shrink-0 accent-blue-600"
            checked={enabled}
            disabled={busy}
            onChange={(e) => void setGuestLoginEnabled(e.target.checked)}
            aria-label="Allow guest login without password"
          />
        </label>
      )}
      {enabled && state?.dbConfigured ? (
        <p className="mt-3 text-xs text-gray-500">
          Bot flow: <code className="text-[11px]">POST /api/auth/session</code> body{" "}
          <code className="text-[11px]">{`{"guest":true}`}</code> · UI:{" "}
          <Link href="/login" className="text-blue-600 hover:underline">
            /login
          </Link>{" "}
          → Continue as guest
        </p>
      ) : null}
    </>
  );

  if (compact) {
    return (
      <div className="rounded-lg border border-blue-600/25 bg-blue-600/5 p-4">{body}</div>
    );
  }

  return (
    <AdminCard
      title="Guest login (bot testing)"
      subtitle="Instant site-wide — no deploy. When on, anyone can enter without email or password."
    >
      {body}
    </AdminCard>
  );
}
