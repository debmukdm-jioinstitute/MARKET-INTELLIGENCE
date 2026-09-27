"use client";

import { motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Soft route enter for portal main content; skipped when prefers-reduced-motion. */
export function PortalPageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const sync = () => setCompact(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (reduce) {
    return <div className="min-h-[50vh]">{children}</div>;
  }

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: compact ? 8 : 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: compact ? 0.26 : 0.32, ease: EASE }}
      className="min-h-[50vh] will-change-[transform,opacity] motion-reduce:transform-none"
    >
      {children}
    </motion.div>
  );
}
