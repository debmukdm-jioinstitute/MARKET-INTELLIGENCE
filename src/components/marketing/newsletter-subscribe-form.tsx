"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";

export function NewsletterSubscribeForm({ className, dark }: { className?: string; dark?: boolean }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading" || status === "done") return;
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to subscribe");
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to subscribe");
    }
  }

  if (status === "done") {
    return (
      <p className={cn("text-sm font-medium", dark ? "text-white" : "text-emerald-600", className)}>
        You&apos;re subscribed — watch your inbox.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className={cn("space-y-2", className)}>
      <div className={cn("flex items-center gap-2 rounded-full border p-1", dark ? "border-white/30 bg-white/10" : "border-border bg-card")}>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          className={cn(
            "min-w-0 flex-1 rounded-full bg-transparent px-3.5 py-2 text-sm outline-none",
            dark ? "text-white placeholder:text-white/60" : "text-foreground placeholder:text-muted-foreground",
          )}
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className={cn(
            "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60",
            dark ? "bg-white text-blue-700 hover:bg-blue-50" : "bg-blue-600 text-white hover:bg-blue-700",
          )}
        >
          {status === "loading" ? "Joining…" : "Subscribe"}
        </button>
      </div>
      {error ? <p className="text-sm text-rose-500">{error}</p> : null}
    </form>
  );
}
