"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem("mi_sid");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("mi_sid", id);
  }
  return id;
}

function beacon(payload: Record<string, unknown>) {
  fetch("/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {});
}

function routeKey(pathname: string, search: URLSearchParams): string {
  const qs = search.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

function PageviewTrackerInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const enteredAt = useRef(0);
  const prevRoute = useRef<string | null>(null);

  useEffect(() => {
    const sessionId = getSessionId();
    const ua = typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 240) : "";
    const current = routeKey(pathname, searchParams);

    if (prevRoute.current && prevRoute.current !== current) {
      const duration_sec = Math.min(86400, Math.round((Date.now() - enteredAt.current) / 1000));
      beacon({
        path: prevRoute.current,
        referrer: document.referrer || null,
        session_id: sessionId,
        duration_sec,
        event_type: "pageview",
        user_agent: ua,
      });
    }

    if (prevRoute.current !== current) {
      prevRoute.current = current;
      enteredAt.current = Date.now();
      beacon({
        path: current,
        referrer: document.referrer || null,
        session_id: sessionId,
        event_type: "pageview",
        user_agent: ua,
      });
    }
  }, [pathname, searchParams]);

  return null;
}

/** Fires pageview + time-on-page beacons on route and query changes. */
export function PageviewTracker() {
  return (
    <Suspense fallback={null}>
      <PageviewTrackerInner />
    </Suspense>
  );
}
