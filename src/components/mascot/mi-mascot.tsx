"use client";

import { AnimatePresence, motion, useReducedMotion, type TargetAndTransition } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MascotTip } from "./mascot-tips";

const MODE_KEY = "mi-mascot-mode";
const LEGACY_HIDDEN_KEY = "mi-mascot-hidden";

type MascotMode = "normal" | "docked-left" | "docked-right" | "hidden";

// Gestures are body motion only; the face artwork is never altered.
const GESTURES: Record<MascotTip["gesture"], TargetAndTransition> = {
  wave: { rotate: [0, -10, 8, -10, 6, 0], y: [0, -6, 0], transition: { duration: 1.4 } },
  point: { rotate: [0, 7, 5, 7, 0], x: [0, 8, 4, 8, 0], transition: { duration: 1.6 } },
  inspect: { rotate: [0, -6, -4, -6, 0], scale: [1, 1.07, 1.05, 1.07, 1], transition: { duration: 1.6 } },
  cheer: { y: [0, -18, 0, -12, 0], rotate: [0, 6, -6, 4, 0], transition: { duration: 1.2 } },
};

function readMode(): MascotMode {
  try {
    const raw = window.localStorage.getItem(MODE_KEY);
    if (raw === "normal" || raw === "docked-left" || raw === "docked-right" || raw === "hidden") return raw;
    if (window.localStorage.getItem(LEGACY_HIDDEN_KEY) === "1") return "hidden";
  } catch {
    /* storage unavailable */
  }
  return "normal";
}

function persistMode(mode: MascotMode) {
  try {
    window.localStorage.setItem(MODE_KEY, mode);
    window.localStorage.setItem(LEGACY_HIDDEN_KEY, mode === "hidden" ? "1" : "0");
  } catch {
    /* storage unavailable */
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
  const [mode, setMode] = useState<MascotMode>("normal");
  const [open, setOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [gestureTick, setGestureTick] = useState(0);
  const lastKey = useRef(tipKey);

  useEffect(() => {
    setMode(readMode());
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
    if (!open || mode !== "normal") return;
    const t = window.setTimeout(() => setOpen(false), 9000);
    return () => window.clearTimeout(t);
  }, [open, tipKey, mode]);

  const setModePersist = useCallback((next: MascotMode) => {
    setMode(next);
    persistMode(next);
    if (next !== "normal") setOpen(false);
  }, []);

  if (!mounted || !tip) return null;

  const gesture = reduce ? undefined : GESTURES[tip.gesture];
  const pointing = mode === "normal" && dockRightOnPoint && tip.gesture === "point";
  const sprite = pointing ? "/mascot/mi-owl-point-sm.webp" : "/mascot/mi-owl-sm.webp";
  const defaultDockSide: "docked-left" | "docked-right" = pointing ? "docked-right" : "docked-left";

  const bottomClass =
    "bottom-[max(4.75rem,env(safe-area-inset-bottom,0px)+3.5rem)] md:bottom-5";

  if (mode === "docked-left" || mode === "docked-right") {
    const onLeft = mode === "docked-left";
    return (
      <div className={`pointer-events-none fixed ${bottomClass} z-40 ${onLeft ? "left-0" : "right-0"} ${className}`} aria-live="polite">
        <button
          type="button"
          onClick={() => setModePersist("normal")}
          aria-label="Bring Mi back"
          title="Bring Mi back"
          className={`pointer-events-auto flex h-24 w-9 items-center justify-center border border-black/10 bg-white text-[11px] font-semibold tracking-wide text-neutral-700 shadow-md hover:bg-neutral-50 dark:border-white/15 dark:bg-neutral-900 dark:text-neutral-200 ${
            onLeft ? "rounded-r-xl border-l-0" : "rounded-l-xl border-r-0"
          }`}
        >
          <span className={onLeft ? "[writing-mode:vertical-rl]" : "[writing-mode:vertical-lr]"}>Mi</span>
        </button>
      </div>
    );
  }

  if (mode === "hidden") {
    return (
      <div
        className={`pointer-events-none fixed ${bottomClass} z-40 ${
          pointing
            ? "right-[max(0.5rem,env(safe-area-inset-right,0px))] md:right-5"
            : "left-[max(0.5rem,env(safe-area-inset-left,0px))] md:left-5"
        } ${className}`}
        aria-live="polite"
      >
        <button
          type="button"
          onClick={() => setModePersist("normal")}
          aria-label="Bring Mi back"
          title="Bring Mi back"
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
      </div>
    );
  }

  return (
    <div
      className={`pointer-events-none fixed ${bottomClass} z-40 flex items-end gap-2 ${
        pointing
          ? "right-[max(0.5rem,env(safe-area-inset-right,0px))] flex-row-reverse md:right-5"
          : "left-[max(0.5rem,env(safe-area-inset-left,0px))] md:left-5"
      } ${className}`}
      aria-live="polite"
    >
      <motion.div
        className="pointer-events-auto relative shrink-0"
        drag={reduce ? false : "x"}
        dragElastic={0.12}
        dragMomentum={false}
        dragConstraints={{ left: pointing ? -140 : -20, right: pointing ? 20 : 140 }}
        onDragEnd={(_, info) => {
          if (info.offset.x < -88) setModePersist("docked-left");
          else if (info.offset.x > 88) setModePersist("docked-right");
        }}
      >
        <div className="absolute -right-1 -top-1 z-20 flex gap-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setModePersist(defaultDockSide);
            }}
            aria-label="Tuck Mi to the side"
            title="Tuck to side"
            className="flex h-6 w-6 items-center justify-center rounded-full border border-black/10 bg-white text-neutral-700 shadow hover:bg-neutral-50 dark:border-white/20 dark:bg-neutral-900 dark:text-neutral-100"
          >
            {defaultDockSide === "docked-left" ? <ChevronLeft className="size-3.5" aria-hidden /> : <ChevronRight className="size-3.5" aria-hidden />}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setModePersist("hidden");
            }}
            aria-label="Dismiss Mi"
            title="Dismiss"
            className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-900 text-white shadow hover:bg-neutral-700"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
        <motion.button
          type="button"
          onClick={() => {
            setOpen((o) => !o);
            setGestureTick((n) => n + 1);
          }}
          aria-label={open ? "Hide Mi's tip" : "Show Mi's tip"}
          className={`relative cursor-pointer select-none touch-pan-y transition-[width,height] duration-300 ${open ? "h-20 w-20 md:h-24 md:w-24" : "h-14 w-14 md:h-16 md:w-16"}`}
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
      </motion.div>

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
              onClick={() => setModePersist("hidden")}
              aria-label="Dismiss Mi"
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
    </div>
  );
}
