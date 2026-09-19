"use client";

import { useAuth } from "@/components/providers/auth-provider";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function AuthForm({ mode, next = "/app" }: { mode: "login" | "signup"; next?: string }) {
  const { login, signup } = useAuth();
  const router = useRouter();
  const dest = next.startsWith("/") ? next : "/app";
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
    <div className="mx-auto w-full max-w-[420px]">
      <Link href="/" className="font-[Tiny5] text-lg tracking-wide text-[#111]">
        market intelligence
      </Link>
      <h1 className="mt-10 font-[Tiny5] text-4xl leading-none text-[#111]">
        {mode === "signup" ? "Create a free account." : "Sign in."}
      </h1>
      <p className="mt-3 text-sm leading-6 text-[#555]">
        {mode === "signup"
          ? "Open a virtual desk in seconds. No brokerage. No card."
          : "Return to your books, research, and risk terminal."}
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-3">
        {mode === "signup" ? (
          <input
            name="name"
            required
            placeholder="Full name"
            className="h-12 w-full rounded-full border border-[#ddd] bg-white px-5 text-sm outline-none focus:border-[#111]"
          />
        ) : null}
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          className="h-12 w-full rounded-full border border-[#ddd] bg-white px-5 text-sm outline-none focus:border-[#111]"
        />
        <input
          name="password"
          type="password"
          required
          minLength={6}
          placeholder="Password"
          className="h-12 w-full rounded-full border border-[#ddd] bg-white px-5 text-sm outline-none focus:border-[#111]"
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          disabled={pending}
          className="h-12 w-full rounded-full bg-[#111] text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Working…" : mode === "signup" ? "Start free →" : "Enter terminal →"}
        </button>
      </form>
      <p className="mt-6 text-sm text-[#666]">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href="/signup" className="underline">
              Create a free account
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
