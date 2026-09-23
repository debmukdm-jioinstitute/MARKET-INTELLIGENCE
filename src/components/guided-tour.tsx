import { useEffect, useState } from "react";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { AnimatePresence, motion } from "framer-motion";
import { X, Play } from "lucide-react";
import { NAV_COLUMNS } from "@/lib/nav-columns";

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

    const steps: DriveStep[] = [];

    NAV_COLUMNS.forEach((col, index) => {
      // Step for the main column heading
      steps.push({
        element: `#nav-${col.title.toLowerCase()}`,
        popover: {
          title: col.title,
          description: `Let's explore the features available under ${col.title}.`,
          side: "bottom",
          align: "start"
        },
        onHighlightStarted: () => {
          // ensure the column is closed when highlighting the main nav
          window.dispatchEvent(new CustomEvent("close-nav"));
        }
      });
      
      // Steps for each nested item
      col.items.forEach(item => {
        const id = `nav-item-${col.title.toLowerCase()}-${item.label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
        steps.push({
          element: `#${id}`,
          popover: {
            title: item.label,
            description: item.desc,
            side: "right",
            align: "start"
          },
          onHighlightStarted: () => {
            // keep the column open
            window.dispatchEvent(new CustomEvent("open-nav", { detail: index }));
          }
        });
      });
    });

    const driverObj = driver({
      showProgress: true,
      animate: true,
      popoverClass: "guided-tour-theme",
      steps,
      onDestroyStarted: () => {
        window.dispatchEvent(new CustomEvent("close-nav"));
        driverObj.destroy();
      }
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
