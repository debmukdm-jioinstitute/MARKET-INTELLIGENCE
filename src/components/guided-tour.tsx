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
            description: `
              <p class="mb-2">Everything you need to track the live market action.</p>
              <ul class="text-left space-y-1.5 text-[13px]">
                <li><b>Overview:</b> See stocks, bonds, and currencies all in one place.</li>
                <li><b>India Cockpit:</b> Live updates and deep dive into the NSE and BSE markets.</li>
                <li><b>Sector Comparables:</b> See which industries are performing best.</li>
                <li><b>Valuation:</b> Check if the market is too expensive or cheap right now.</li>
                <li><b>Breadth & Momentum:</b> See how many stocks are actually going up versus down.</li>
                <li><b>Derivatives:</b> Track options and futures trading activity.</li>
              </ul>
            `,
            side: "bottom",
            align: "start"
          }
        },
        {
          element: "#nav-macro",
          popover: {
            title: "Macro",
            description: `
              <p class="mb-2">Understand the big economic picture and policies.</p>
              <ul class="text-left space-y-1.5 text-[13px]">
                <li><b>Global Board:</b> Track worldwide growth, inflation, and money supply.</li>
                <li><b>India Macro:</b> Important Indian economic data (like GDP and inflation) on one page.</li>
                <li><b>RBI & Liquidity:</b> See what the central bank is doing with interest rates.</li>
                <li><b>Currency:</b> Track the US Dollar, Rupee, and other major currencies.</li>
                <li><b>Commodities:</b> Keep an eye on Crude Oil, Gold, and metals.</li>
                <li><b>Economic Calendar:</b> A schedule of upcoming major economic announcements.</li>
              </ul>
            `,
            side: "bottom",
            align: "start"
          }
        },
        {
          element: "#nav-portfolio",
          popover: {
            title: "Portfolio",
            description: `
              <p class="mb-2">Manage and analyze your investments.</p>
              <ul class="text-left space-y-1.5 text-[13px]">
                <li><b>Command Center:</b> Your main dashboard to see your profits, losses, and live positions.</li>
                <li><b>Allocation:</b> See how your money is divided across different types of investments.</li>
                <li><b>Risk & VaR:</b> Understand how much risk you are taking and potential losses.</li>
                <li><b>Attribution:</b> Find out exactly which decisions made or lost you money.</li>
                <li><b>Quant & Factors:</b> Advanced analysis of the mathematical traits of your portfolio.</li>
                <li><b>Optimizer:</b> Get suggestions on how to rebalance your portfolio for better returns.</li>
              </ul>
            `,
            side: "bottom",
            align: "start"
          }
        },
        {
          element: "#nav-research",
          popover: {
            title: "Research",
            description: `
              <p class="mb-2">Deep dive into specific companies and trading ideas.</p>
              <ul class="text-left space-y-1.5 text-[13px]">
                <li><b>Company Workbench:</b> Detailed information and history for any specific stock.</li>
                <li><b>AI Desk:</b> Our AI analyzes data to help you find new trading opportunities.</li>
                <li><b>IPO Pipeline:</b> Track upcoming new stock market listings.</li>
                <li><b>Options Flow:</b> Our AI spots unusual and large options trades in the market.</li>
                <li><b>Research Reports:</b> Read detailed notes and models generated for our coverage list.</li>
              </ul>
            `,
            side: "bottom",
            align: "start"
          }
        },
        {
          element: "#nav-intelligence",
          popover: {
            title: "Intelligence",
            description: `
              <p class="mb-2">Stay updated with AI-curated news and data health.</p>
              <ul class="text-left space-y-1.5 text-[13px]">
                <li><b>Intelligence Feed:</b> AI reads the news and scores whether it's good or bad.</li>
                <li><b>System & Data:</b> Check if all our market data sources are working smoothly.</li>
                <li><b>Data Feeds:</b> View the complete list of providers supplying our data.</li>
                <li><b>Daily Brief:</b> A quick daily summary of the market's main story.</li>
              </ul>
            `,
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
