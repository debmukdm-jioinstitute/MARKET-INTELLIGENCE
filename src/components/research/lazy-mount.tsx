"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Renders a light placeholder until it is within `rootMargin` of the viewport, then mounts
 * `children` once (never unmounts). Below-the-fold research panels therefore do not
 * download their JS, fetch their data or render during page load (cuts TBT/TTI).
 * `anchorId` keeps section-nav links working: the placeholder carries the id until the
 * real panel (which renders the same id) replaces it.
 */
export function LazyMount({
  children,
  anchorId,
  minHeight = 320,
  rootMargin = "600px 0px",
}: {
  children: React.ReactNode;
  anchorId?: string;
  minHeight?: number;
  rootMargin?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          setVisible(true);
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible, rootMargin]);

  if (visible) return <>{children}</>;
  return <div ref={ref} id={anchorId} aria-hidden="true" className="rounded-xl border border-border/40 bg-muted/10" style={{ minHeight }} />;
}
