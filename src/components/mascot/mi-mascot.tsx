"use client";

import { AnimatePresence, motion, useReducedMotion, type TargetAndTransition } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MascotTip } from "./mascot-tips";

const STORAGE_KEY = "mi-mascot-hidden";

// Gestures are body motion only; the face artwork is never altered.
const GESTURES: Record<MascotTip["gesture"], TargetAndTransition> = {
  wave: { rotate: [0, -10, 8, -10, 6, 0], y: [0, -6, 0], transition: { duration: 1.4 } },
  point: { rotate: [0, 7, 5, 7, 0], x: [0, 8, 4, 8, 0], transition: { duration: 1.6 } },
  inspect: { rotate: [0, -6, -4, -6, 0], scale: [1, 1.07, 1.05, 1.07, 1], transition: { duration: 1.6 } },
  cheer: { y: [0, -18, 0, -12, 0], rotate: [0, 6, -6, 4, 0], transition: { duration: 1.2 } },
};

function readHidden(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function MiMascot({
  tip,
  tipKey,
  className = "",
  dockRightOnPoint = false,
}: {
  tip: MascotTip | null;
  /** Changes whenever the tip should re-announce (section id or route). */
  tipKey: string;
  className?: string;
  /** Pointing pose faces left, so dock on the right edge for "point" tips (only where that corner is free). */
  dockRightOnPoint?: boolean;
}) {
  const reduce = useReducedMotion();
  const [hidden, setHidden] = useState(true);
  const [open, setOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [gestureTick, setGestureTick] = useState(0);
  const lastKey = useRef(tipKey);

  useEffect(() => {
    setHidden(readHidden());
    setMounted(true);
  }, []);

  // New tip: reopen bubble and perform its gesture.
  useEffect(() => {
    if (lastKey.current === tipKey) return;
    lastKey.current = tipKey;
    setOpen(true);
    setGestureTick((n) => n + 1);
  }, [tipKey]);

  // Auto-fold the bubble after a while so it never nags.
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => setOpen(false), 9000);
    return () => window.clearTimeout(t);
  }, [open, tipKey]);

  const setHiddenPersist = useCallback((v: boolean) => {
    setHidden(v);
    try {
      window.localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
    } catch {
      /* storage unavailable */
    }
  }, []);

  if (!mounted || !tip) return null;

  const gesture = reduce ? undefined : GESTURES[tip.gesture];
  const pointing = !hidden && dockRightOnPoint && tip.gesture === "point";
  const sprite = pointing ? "/mascot/mi-owl-point-sm.webp" : "/mascot/mi-owl-sm.webp";

  return (
    <div
      className={`pointer-events-none fixed bottom-[max(4.75rem,env(safe-area-inset-bottom,0px)+3.5rem)] z-40 flex items-end gap-2 md:bottom-5 ${
        pointing
          ? "right-[max(0.5rem,env(safe-area-inset-right,0px))] flex-row-reverse md:right-5"
          : "left-[max(0.5rem,env(safe-area-inset-left,0px))] md:left-5"
      } ${className}`}
      aria-live="polite"
    >
      {hidden ? (
        // Dismissed: Mi hangs from a ledge and swings; click to bring him back.
        <button
          type="button"
          onClick={() => setHiddenPersist(false)}
          aria-label="Bring Mi back"
          className="pointer-events-auto relative -mb-1 flex w-16 flex-col items-center"
        >
          <span aria-hidden className="h-1.5 w-16 rounded-full bg-neutral-400 shadow dark:bg-neutral-500" />
          <motion.span
            className="-mt-1 block"
            style={{ transformOrigin: "50% 0%" }}
            animate={reduce ? undefined : { rotate: [-5, 5, -5] }}
            transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
          >
            <Image src="/mascot/mi-owl-hang-sm.webp" alt="" width={52} height={71} unoptimized className="h-auto w-[52px]" draggable={false} />
          </motion.span>
        </button>
      ) : (
        <>
          <motion.button
            type="button"
            onClick={() => {
              setOpen((o) => !o);
              setGestureTick((n) => n + 1);
            }}
            aria-label={open ? "Hide Mi's tip" : "Show Mi's tip"}
            className="pointer-events-auto relative h-20 w-20 shrink-0 cursor-pointer select-none md:h-24 md:w-24"
            initial={reduce ? false : { y: 40, opacity: 0 }}
            animate={reduce ? undefined : { y: 0, opacity: 1 }}
            whileHover={reduce ? undefined : { scale: 1.06, rotate: -4 }}
            whileTap={reduce ? undefined : { scale: 0.95 }}
          >
            <motion.span
              key={gestureTick}
              className="block h-full w-full"
              animate={gesture ?? undefined}
              style={{ transformOrigin: "50% 90%" }}
            >
              <motion.span
                className="block h-full w-full"
                animate={reduce ? undefined : { y: [0, -4, 0] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Image
                  src={sprite}
                  alt="Mi, the Market Intelligence owl"
                  width={96}
                  height={96}
                  priority
                  unoptimized
                  className="h-full w-full object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.25)]"
                  draggable={false}
                />
              </motion.span>
            </motion.span>
          </motion.button>

          <AnimatePresence mode="wait">
            {open ? (
              <motion.div
                key={tipKey}
                initial={reduce ? false : { opacity: 0, x: -10, scale: 0.92 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -6, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 380, damping: 26 }}
                className="pointer-events-auto relative mb-6 max-w-[15rem] rounded-2xl border border-black/10 bg-white px-3.5 py-2.5 text-[13px] leading-snug text-neutral-800 shadow-lg dark:border-white/15 dark:bg-neutral-900 dark:text-neutral-100 md:max-w-xs"
                role="status"
              >
                <span
                  aria-hidden
                  className={`absolute bottom-4 h-3 w-3 rotate-45 border-black/10 bg-white dark:border-white/15 dark:bg-neutral-900 ${
                    pointing ? "-right-1.5 border-r border-t" : "-left-1.5 border-b border-l"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setHiddenPersist(true)}
                  aria-label="Hide Mi"
                  className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-[11px] text-white hover:bg-neutral-700"
                >
                  ×
                </button>
                <p>{tip.text}</p>
                {tip.cta ? (
                  <Link href={tip.cta.href} className="mt-1.5 inline-block font-semibold text-blue-600 hover:underline">
                    {tip.cta.label} →
                  </Link>
                ) : null}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
