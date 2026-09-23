"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

const PHRASES = [
  "Get access to Professional data. Without the professional price.",
  "Your portfolio. Your research. all at one place.",
  "Institutional-grade insights. now Simplified.",
  "Everything that you need to understand the market."
];

export function AnimatedHeadline() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((current) => (current + 1) % PHRASES.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative mx-auto flex h-[100px] w-full max-w-4xl flex-col items-center justify-start overflow-visible sm:h-[80px] md:h-[90px]">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 15, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -15, filter: "blur(8px)" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-x-0 mx-auto text-center"
        >
          <span className="block animate-text-gradient bg-gradient-to-r from-blue-600 via-cyan-500 to-violet-500 bg-clip-text pb-2 text-transparent">
            {PHRASES[index]}
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
