"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

const LINES = [
  "India-first market intelligence — research, flow, and macro with sources shown.",
  "AI Desk debates any ticker; Options Flow flags unusual activity before the move.",
  "Start free, try a ₹9 Day Pass, or go unlimited from ₹199 per month.",
] as const;

export function HeroRotatingHeadline() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % LINES.length), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative mx-auto mt-6 min-h-[2.4em] max-w-3xl">
      <AnimatePresence mode="wait">
        <motion.h1
          key={LINES[index]}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="text-[clamp(2.2rem,5vw,3.8rem)] font-semibold leading-[1.1] tracking-tight text-gray-900"
        >
          {LINES[index]}
        </motion.h1>
      </AnimatePresence>
    </div>
  );
}
