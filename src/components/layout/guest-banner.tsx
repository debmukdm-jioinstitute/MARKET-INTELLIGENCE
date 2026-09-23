"use client";

import { useAuth } from "@/components/providers/auth-provider";
import Link from "next/link";

export function GuestBanner() {
  const { isGuest } = useAuth();
  if (!isGuest) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-600/20 bg-blue-600/10 px-6 py-2 text-sm text-blue-700">
      <p>
        <span className="font-semibold uppercase tracking-wide text-blue-600">Guest mode</span>
        — Explore the full terminal with demo books. Trades and settings are not saved to an account.
      </p>
      <Link
        href="/signup"
        className="shrink-0 rounded-md bg-blue-600 px-3 py-1 font-medium text-white transition hover:bg-blue-600"
      >
        Create free account
      </Link>
    </div>
  );
}
