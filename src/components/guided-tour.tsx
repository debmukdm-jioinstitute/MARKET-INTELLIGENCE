"use client";

import { useEffect, useState } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { AnimatePresence, motion } from "framer-motion";
import { X, Play } from "lucide-react";

export function GuidedTour() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Only show if they haven't seen the tour
    const hasSeenTour = localStorage.getItem("hasSeenTour");
    if (!hasSeenTour) {
      // Slight delay so the page loads first
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleSkip = () => {
    localStorage.setItem("hasSeenTour", "true");
    setShowPrompt(false);
  };

  const startTour = () => {
    localStorage.setItem("hasSeenTour", "true");
    setShowPrompt(false);

    const driverObj = driver({
      showProgress: true,
      animate: true,
      popoverClass: "guided-tour-theme",
      steps: [
        {
          element: "#nav-markets",
          popover: {
            title: "Markets",
            description: "Cross-asset tape: equities, rates, and FX in one board. Access India Cockpit, Sector Comparables, Valuation metrics, Breadth & Momentum, and Derivatives positioning.",
            side: "bottom",
            align: "start"
          }
        },
        {
          element: "#nav-macro",
          popover: {
            title: "Macro",
            description: "Regime-first read across growth, inflation, liquidity. Dive into India Macro, RBI & Liquidity, Currency, Commodities, and upcoming Economic Calendar prints.",
            side: "bottom",
            align: "start"
          }
        },
        {
          element: "#nav-portfolio",
          popover: {
            title: "Portfolio",
            description: "Mark-to-market NAV, P&L, and live positions in the Command Center. Analyze Allocation, Risk & VaR, Attribution, Quant Factors, and use the Optimizer.",
            side: "bottom",
            align: "start"
          }
        },
        {
          element: "#nav-research",
          popover: {
            title: "Research",
            description: "Deep dive with the Company Workbench, Alpha discovery in the AI Desk, IPO Pipeline tracking, unusual Options Flow, and Model-driven Research Reports.",
            side: "bottom",
            align: "start"
          }
        },
        {
          element: "#nav-intelligence",
          popover: {
            title: "Intelligence",
            description: "AI-scored Intelligence Feed for news impact. Monitor System & Data health, connected Data Feeds, and read the external Daily Brief.",
            side: "bottom",
            align: "start"
          }
        }
      ]
    });

    driverObj.drive();
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-white p-8 shadow-2xl text-center"
          >
            <div className="absolute -left-32 -top-32 h-[300px] w-[300px] rounded-full bg-blue-500/20 blur-[80px] pointer-events-none" />
            <div className="absolute -bottom-32 -right-32 h-[300px] w-[300px] rounded-full bg-cyan-400/20 blur-[80px] pointer-events-none" />

            <div className="relative z-10">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/30">
                <Play className="h-8 w-8 text-white ml-1" />
              </div>
              <h2 className="mb-2 text-2xl font-bold text-gray-900 tracking-tight">
                Welcome to Market Intelligence
              </h2>
              <p className="mb-8 text-gray-500 text-sm leading-relaxed">
                Would you like a quick guided tour to explore the platform's key features, tools, and analytics?
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={startTour}
                  className="w-full rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/25 active:scale-[0.98]"
                >
                  Start Guided Tour
                </button>
                <button
                  onClick={handleSkip}
                  className="w-full rounded-xl bg-gray-100 px-4 py-3.5 text-sm font-semibold text-gray-600 transition-all hover:bg-gray-200 active:scale-[0.98]"
                >
                  Skip for now
                </button>
              </div>
            </div>
            
            <button
              onClick={handleSkip}
              className="absolute right-4 top-4 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
