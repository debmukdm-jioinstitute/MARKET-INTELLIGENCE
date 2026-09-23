"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

export function FlippingFaqHeadline() {
  const [isAnswered, setIsAnswered] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnswered((prev) => !prev);
    }, 3000); // Flips every 3 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center justify-center h-12 perspective-[1000px]">
      <AnimatePresence mode="wait">
        {!isAnswered ? (
          <motion.h2
            key="questions"
            initial={{ rotateX: -90, opacity: 0 }}
            animate={{ rotateX: 0, opacity: 1 }}
            exit={{ rotateX: 90, opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="absolute text-center text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl"
          >
            Questions?
          </motion.h2>
        ) : (
          <motion.h2
            key="answered"
            initial={{ rotateX: -90, opacity: 0 }}
            animate={{ rotateX: 0, opacity: 1 }}
            exit={{ rotateX: 90, opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="absolute text-center text-3xl font-semibold tracking-tight text-blue-600 sm:text-4xl"
          >
            Answered.
          </motion.h2>
        )}
      </AnimatePresence>
    </div>
  );
}
