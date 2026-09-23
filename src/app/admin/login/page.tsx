"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Login failed");
      if (json.user?.role !== "admin") {
        setError("This account does not have admin access.");
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-muted px-5">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-white p-6 shadow-[var(--shadow-lg)]">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-blue-600">Market Intelligence · Admin</p>
          <h1 className="mt-1 text-xl font-semibold text-foreground">Backend sign-in</h1>
        </div>
        <div className="space-y-1">
          <label className="text-sm text-gray-500">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-gray-500">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
          />
        </div>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-[var(--shadow-sm)] transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
        <p className="text-sm text-gray-500">
          Admin access is granted by email allowlist. Sign up for a regular account on the main site first, then have your email
          added to <code className="text-gray-500">ADMIN_EMAILS</code>.
        </p>
      </form>
    </main>
  );
}
