"use client";

import { useAuth } from "@/components/providers/auth-provider";
import Link from "next/link";

export function GuestBanner() {
  const { isGuest } = useAuth();
  if (!isGuest) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/20 bg-amber-500/10 px-6 py-2 text-xs text-amber-100">
      <p>
        <span className="font-semibold uppercase tracking-wide text-amber-300">Guest mode</span>
        — Explore the full terminal with demo books. Trades and settings are not saved to an account.
      </p>
      <Link
        href="/signup"
        className="shrink-0 rounded-md bg-amber-400 px-3 py-1 font-medium text-black transition hover:bg-amber-300"
      >
        Create free account
      </Link>
    </div>
  );
}
