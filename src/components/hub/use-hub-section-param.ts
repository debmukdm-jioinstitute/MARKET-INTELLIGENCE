"use client";
import { useEffect } from "react";

const HEADER_OFFSET = 112; // top bar + sticky jump chips

/**
 * Scrolls to `#id` and keeps it pinned to the top while sections above it mount and grow, until the visitor scrolls
 * themselves (or 10 s). Returns a cancel function. Also rewrites the URL to the clean `#id` form.
 */
export function alignTo(id: string): () => void {
  let userMoved = false;
  const stop = () => { userMoved = true; };
  const opts = { passive: true } as const;
  window.addEventListener("wheel", stop, opts);
  window.addEventListener("touchmove", stop, opts);
  window.addEventListener("keydown", stop);

  let cleaned = false;
  let tries = 0;
  let timer: ReturnType<typeof setTimeout>;
  const deadline = Date.now() + 10_000;
  const align = () => {
    if (userMoved || Date.now() > deadline) return;
    const el = document.getElementById(id);
    if (!el) return;
    const delta = el.getBoundingClientRect().top - HEADER_OFFSET;
    if (Math.abs(delta) > 4) window.scrollBy({ top: delta, behavior: "auto" });
    if (!cleaned) {
      cleaned = true;
      window.history.replaceState(null, "", `${window.location.pathname}#${id}`);
    }
  };
  // Embedded sections mount and load data after first paint, so keep re-aligning on every layout change.
  const ro = new ResizeObserver(align);
  ro.observe(document.body);
  const poll = () => {
    const el = document.getElementById(id);
    if (el) align();
    else if (tries++ < 20) timer = setTimeout(poll, 100);
  };
  poll();
  return () => {
    clearTimeout(timer);
    ro.disconnect();
    window.removeEventListener("wheel", stop);
    window.removeEventListener("touchmove", stop);
    window.removeEventListener("keydown", stop);
  };
}

/** Reads `?section=<id>` (or `#id`) once on mount, scrolls to it via `alignTo`. */
export function useHubSectionParam(onTarget?: (id: string) => void) {
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("section") || window.location.hash.replace(/^#/, "");
    if (!id) return;
    onTarget?.(id);
    return alignTo(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
