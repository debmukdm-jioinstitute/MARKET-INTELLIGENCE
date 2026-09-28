"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

/** Scroll to `#id` or `?view=` section once per navigation (calendar, momentum, etc.). */
export function ScrollToUrlSection() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const view = searchParams.get("view");
    const hash = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
    const targetId = view === "calendar" ? "calendar" : view === "momentum" ? "momentum" : view || hash;
    if (!targetId) return;

    const el = document.getElementById(targetId);
    if (!el) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }, [searchParams]);

  return null;
}
