"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Fires a fire-and-forget pageview beacon to the admin analytics backend on every route change. */
export function PageviewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname, referrer: document.referrer || null }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
