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
  // Once the enter animation completes, drop the transform entirely so
  // `position: sticky` descendants keep working on mobile Safari/Chrome
  // (any transformed ancestor breaks sticky). framer-motion clears its own
  // will-change on completion; the style merge below removes the transform.
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const sync = () => setCompact(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // The inner motion.div remounts on route change via key={pathname}, but this
  // component's state does not — reset explicitly so the next page animates.
  useEffect(() => {
    setSettled(false);
  }, [pathname]);

  // Always render the SAME element type. Swapping <div> <-> <motion.div> after the
  // matchMedia effect ran remounted the whole page on mobile, so every page-level
  // useEffect fetch fired twice.
  const still = Boolean(reduce || compact);
  return (
    <motion.div
      key={pathname}
      initial={still ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={still ? { duration: 0 } : { duration: 0.32, ease: EASE }}
      onAnimationComplete={() => setSettled(true)}
      className="min-h-[50dvh]"
      style={settled ? { transform: "none" } : undefined}
    >
      {children}
    </motion.div>
  );
}
