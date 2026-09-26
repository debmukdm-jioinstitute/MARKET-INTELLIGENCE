"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

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

/** Fires pageview + time-on-page beacons on every route change. */
export function PageviewTracker() {
  const pathname = usePathname();
  const enteredAt = useRef(Date.now());
  const prevPath = useRef<string | null>(null);

  useEffect(() => {
    const sessionId = getSessionId();
    const ua = typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 240) : "";

    if (prevPath.current) {
      const duration_sec = Math.min(86400, Math.round((Date.now() - enteredAt.current) / 1000));
      beacon({
        path: prevPath.current,
        referrer: document.referrer || null,
        session_id: sessionId,
        duration_sec,
        event_type: "pageview",
        user_agent: ua,
      });
    }

    prevPath.current = pathname;
    enteredAt.current = Date.now();

    beacon({
      path: pathname,
      referrer: document.referrer || null,
      session_id: sessionId,
      event_type: "pageview",
      user_agent: ua,
    });
  }, [pathname]);

  return null;
}
