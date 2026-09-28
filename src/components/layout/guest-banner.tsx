"use client";

import { useAuth } from "@/components/providers/auth-provider";
import Link from "next/link";

export function GuestBanner() {
  const { isGuest } = useAuth();
  if (!isGuest) return null;

  return (
    <div className="border-b border-blue-600/20 bg-blue-600/10 px-6 py-2.5 text-sm text-blue-800">
      <p>
        You&apos;re browsing as a guest — everything here uses sample data. Nothing you change will be saved.{" "}
        <Link href="/signup?from=demo" className="font-semibold text-blue-700 underline-offset-2 hover:underline">
          Create a free account to save your work
        </Link>
        .
      </p>
    </div>
  );
}
