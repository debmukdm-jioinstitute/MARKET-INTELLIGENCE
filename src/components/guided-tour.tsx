import { useEffect, useState } from "react";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { AnimatePresence, motion } from "framer-motion";
import { X, Play } from "lucide-react";
import { slug } from "@/lib/nav-columns";

/** One tour stop per top-level menu section, in menu order. Plain language, no jargon. */
const TOUR_SECTIONS = [
  { title: "Today", heading: "Today: what's happening now", text: "Your daily starting point. Check the market snapshot (indices, rupee, oil, gold) and read the AI Daily Brief — a 2-minute summary with sources." },
  { title: "Invest", heading: "Invest: for the long term", text: "Research a company, check if the market is cheap or expensive, and see how the economy (RBI, inflation, global trends) could affect your stocks." },
  { title: "Trade", heading: "Trade: short-term and intraday", text: "Scan Nifty 500 for breakouts, follow AI signals and unusual options activity, then backtest an idea on history before you risk money." },
  { title: "My Portfolio", heading: "My Portfolio: your own holdings", text: "See your value and profit & loss, then check risk, what drove your returns, and how you could rebalance. Import holdings from Zerodha, Upstox or Dhan." },
  { title: "Data & Tools", heading: "Data & Tools: sources and downloads", text: "See where every number comes from and how fresh it is, or download all the data as one Excel workbook." },
] as const;

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

    const wide = window.matchMedia("(min-width: 1024px)").matches;
    const steps: DriveStep[] = [
      {
        popover: {
          title: "Welcome to Market Intelligence",
          description: `Everything is organised by what you want to do. There are just ${TOUR_SECTIONS.length} sections — this takes about 30 seconds. ${wide ? "Hover any section afterwards to see its tasks." : "Tap any section afterwards to see its tasks."}`,
        },
      },
    ];

    TOUR_SECTIONS.forEach((sec) => {
      steps.push({
        element: wide ? `#nav-${slug(sec.title)}` : `#nav-bottom-${slug(sec.title)}`,
        popover: {
          title: sec.heading,
          description: sec.text,
          side: wide ? "bottom" : "top",
          align: wide ? "start" : "center",
        },
      });
    });

    if (!wide) {
      steps.push({
        element: "#nav-menu-trigger",
        popover: {
          title: "Menu: start here",
          description: "Not sure where to begin? Open Menu for four quick shortcuts — Daily Brief, Company Workbench, Stock Scanner or My Portfolio.",
          side: "bottom",
          align: "start",
        },
      });
    }

    steps.push(
      {
        element: "#tour-search",
        popover: {
          title: "Search any stock",
          description: "Type a company or ticker (NSE or US) to jump straight to its page. On a keyboard, press Space to focus it.",
          side: "bottom",
          align: wide ? "center" : "start",
        },
        onHighlightStarted: () => window.dispatchEvent(new CustomEvent("close-nav")),
      },
      {
        element: "#tour-alerts",
        popover: {
          title: "Alerts bell",
          description: "Important market events and your own alert rules show up here.",
          side: "bottom",
          align: "end",
        },
      },
    );

    const driverObj = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      smoothScroll: true,
      stagePadding: wide ? 6 : 4,
      popoverClass: "guided-tour-theme",
      nextBtnText: "Next",
      prevBtnText: "Back",
      doneBtnText: "Got it",
      steps,
      onDestroyStarted: () => {
        window.dispatchEvent(new CustomEvent("close-nav"));
        driverObj.destroy();
      },
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
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-3xl border border-white/20 bg-white p-6 text-center shadow-2xl sm:p-8"
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
                Would you like a quick guided tour to explore the platform&apos;s five sections and where to start?
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={startTour}
                  className="w-full min-h-12 rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/25 active:scale-[0.98]"
                >
                  Start Guided Tour
                </button>
                <button
                  onClick={handleSkip}
                  className="w-full min-h-12 rounded-xl bg-gray-100 px-4 py-3.5 text-sm font-semibold text-gray-600 transition-all hover:bg-gray-200 active:scale-[0.98]"
                >
                  Skip for now
                </button>
              </div>
            </div>
            
            <button
              onClick={handleSkip}
              aria-label="Close" className="absolute right-3 top-3 rounded-full p-2.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
