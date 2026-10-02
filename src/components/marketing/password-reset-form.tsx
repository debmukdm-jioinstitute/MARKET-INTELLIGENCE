"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { useState, type FormEvent } from "react";

const inputClass =
  "h-12 w-full rounded-lg border border-border bg-white px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";
const labelClass = "mb-1.5 block text-sm font-medium text-foreground";

export function PasswordResetForm({ token }: { token?: string }) {
  const isReset = Boolean(token);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const data = new FormData(event.currentTarget);
    try {
      const res = await fetch(isReset ? "/api/auth/reset" : "/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isReset
            ? { token, password: String(data.get("password") ?? "") }
            : { email: String(data.get("email") ?? "") },
        ),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) throw new Error(json.error ?? "Something went wrong.");
      setDone(isReset ? "Password updated. You can sign in now." : (json.message ?? "Check your email."));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative mx-auto w-full max-w-[420px] rounded-2xl border border-border bg-white p-8 shadow-[var(--shadow-lg)]">
      <BrandLogo size="md" priority />
      <h1 className="mt-8 text-[28px] leading-tight font-semibold text-foreground">
        {isReset ? "Choose a new password" : "Reset your password"}
      </h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {isReset ? "Pick a password of at least 6 characters." : "Enter your email and we'll send you a reset link."}
      </p>
      {done ? (
        <p role="status" className="mt-6 text-sm text-foreground">{done}</p>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {isReset ? (
            <div>
              <label htmlFor="password" className={labelClass}>New password</label>
              <input id="password" name="password" type="password" required minLength={6} autoComplete="new-password" className={inputClass} />
            </div>
          ) : (
            <div>
              <label htmlFor="email" className={labelClass}>Email</label>
              <input id="email" name="email" type="email" required autoComplete="email" className={inputClass} />
            </div>
          )}
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          <button
            disabled={pending}
            className="h-12 w-full rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-[var(--shadow-sm)] transition hover:bg-primary/90 disabled:opacity-50"
          >
            {pending ? "Working…" : isReset ? "Update password" : "Send reset link"}
          </button>
        </form>
      )}
      <p className="mt-6 text-sm text-muted-foreground">
        <Link href="/login" className="text-primary underline-offset-4 hover:underline">Back to sign in</Link>
      </p>
    </div>
  );
}
