"use client";

import { useAuth } from "@/components/providers/auth-provider";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const inputClass =
  "h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-[#f5f5f7] placeholder:text-[#636366] outline-none backdrop-blur-sm transition focus:border-[#ff9f0a]/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-[#ff9f0a]/30";

export function AuthForm({ mode, next = "/dashboard" }: { mode: "login" | "signup"; next?: string }) {
  const { login, signup } = useAuth();
  const router = useRouter();
  const dest = next.startsWith("/") ? next : "/dashboard";
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const data = new FormData(event.currentTarget);
    try {
      if (mode === "signup") {
        await signup({
          name: String(data.get("name") ?? ""),
          email: String(data.get("email") ?? ""),
          password: String(data.get("password") ?? ""),
        });
      } else {
        await login({
          email: String(data.get("email") ?? ""),
          password: String(data.get("password") ?? ""),
        });
      }
      router.push(dest);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative mx-auto w-full max-w-[420px]">
      <div className="pointer-events-none absolute -inset-24 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(255,159,10,0.08),transparent_70%)]" />
      <Link href="/" className="font-[Tiny5] text-lg tracking-wide text-white">
        market intelligence
      </Link>
      <h1 className="mt-10 font-[Tiny5] text-4xl leading-none text-white">
        {mode === "signup" ? "Create a free account." : "Sign in."}
      </h1>
      <p className="mt-3 text-sm leading-6 text-[#a1a1a6]">
        {mode === "signup"
          ? "Open a virtual desk in seconds. No brokerage. No card."
          : "Return to your books, research, and risk terminal."}
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-3">
        {mode === "signup" ? (
          <input name="name" required placeholder="Full name" className={inputClass} />
        ) : null}
        <input name="email" type="email" required placeholder="Email" className={inputClass} />
        <input name="password" type="password" required minLength={6} placeholder="Password" className={inputClass} />
        {error ? <p className="text-sm text-[#ff453a]">{error}</p> : null}
        <button
          disabled={pending}
          className="h-12 w-full rounded-xl bg-[#f5f5f7] text-sm font-semibold text-black transition hover:bg-white disabled:opacity-50"
        >
          {pending ? "Working…" : mode === "signup" ? "Start free →" : "Enter terminal →"}
        </button>
      </form>
      <p className="mt-6 text-sm text-[#86868b]">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-[#ff9f0a] underline decoration-[#ff9f0a]/30 underline-offset-4">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href="/signup" className="text-[#ff9f0a] underline decoration-[#ff9f0a]/30 underline-offset-4">
              Create a free account
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
