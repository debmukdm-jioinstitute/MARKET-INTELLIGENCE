"use client";

import Link from "next/link";

export default function PortalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center">
      <h1 className="font-heading text-xl font-bold text-foreground">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">
        {error.message?.includes("stack") ? "A calculation failed — try again or go Home." : error.message || "This section failed to load."}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Try again
        </button>
        <Link href="/Home" className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-accent">
          Home
        </Link>
      </div>
    </div>
  );
}
