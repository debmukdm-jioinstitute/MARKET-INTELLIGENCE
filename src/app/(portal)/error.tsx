"use client";

import Link from "next/link";
import { useEffect } from "react";

function reportRouteError(error: Error & { digest?: string }) {
  try {
    const sessionId = sessionStorage.getItem("mi_sid");
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: window.location.pathname + window.location.search,
        event_type: "route_error",
        session_id: sessionId,
        meta: { message: error.message?.slice(0, 240), digest: error.digest ?? null },
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

export default function PortalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportRouteError(error);
  }, [error]);

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
          className="min-h-11 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Try again
        </button>
        <Link href="/Home" className="inline-flex min-h-11 items-center rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-accent">
          Home
        </Link>
      </div>
    </div>
  );
}
