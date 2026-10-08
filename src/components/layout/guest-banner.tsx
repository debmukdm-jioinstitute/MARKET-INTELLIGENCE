"use client";

import { useAuth } from "@/components/providers/auth-provider";
import Link from "next/link";

export function GuestBanner() {
  const { ready, isGuest } = useAuth();
  // `ready` is false on both the server render and the client's first (hydration) render —
  // the session is only known after AuthProvider's effect resolves — so gating on it here
  // keeps this component's very first client output identical to the server's (always null)
  // instead of letting `isGuest` alone decide, which is the same guard AuthGate itself uses.
  if (!ready || !isGuest) return null;

  return (
    <div className="border-b border-blue-600/20 bg-blue-600/10 px-6 py-2.5 text-sm text-blue-800">
      <p>
        You&apos;re browsing as a guest. Market data is live, but nothing you add or change will be saved.{" "}
        <Link href="/signup?from=demo" className="font-semibold text-blue-700 underline-offset-2 hover:underline">
          Create a free account to save your work
        </Link>
        .
      </p>
    </div>
  );
}
