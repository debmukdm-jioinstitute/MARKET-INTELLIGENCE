"use client";

import { useAuth } from "@/components/providers/auth-provider";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const inputClass =
  "h-12 w-full rounded-lg border border-border bg-white px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

export function AuthForm({ mode, next = "/Home" }: { mode: "login" | "signup"; next?: string }) {
  const { login, signup, enterGuest } = useAuth();
  const router = useRouter();
  const dest = next.startsWith("/") ? next : "/Home";
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
    <div className="relative mx-auto w-full max-w-[420px] rounded-2xl border border-border bg-white p-8 shadow-[var(--shadow-lg)]">
      <Link href="/" className="inline-block">
        <img src="/logo.png" alt="Market Intelligence" className="h-8 w-auto dark:invert" />
      </Link>
      <h1 className="mt-8 text-[28px] leading-tight font-semibold text-foreground">
        {mode === "signup" ? "Create a free account" : "Sign in"}
      </h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
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
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <button
          disabled={pending}
          className="h-12 w-full rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-[var(--shadow-sm)] transition hover:bg-primary/90 hover:shadow-[var(--shadow-md)] disabled:opacity-50"
        >
          {pending ? "Working…" : mode === "signup" ? "Start free" : "Enter terminal"}
        </button>
      </form>
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          setError("");
          setPending(true);
          try {
            await enterGuest();
            router.push(dest);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not start guest session.");
          } finally {
            setPending(false);
          }
        }}
        className="mt-3 h-12 w-full rounded-full border border-border text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-50"
      >
        Explore as guest
      </button>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        No account required. Demo books only; create an account to save your desk.
      </p>
      <p className="mt-6 text-sm text-muted-foreground">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href="/signup" className="text-primary underline-offset-4 hover:underline">
              Create a free account
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
