"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Render children only once near the viewport (rootMargin 200px). */
export function LazyMount({ children, minHeight = 260 }: { children: ReactNode; minHeight?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || on) return;
    if (typeof IntersectionObserver === "undefined") { setOn(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } }, { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, [on]);
  return <div ref={ref} style={{ minHeight: on ? undefined : minHeight }}>{on ? children : null}</div>;
}
