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

    const TOUR_DESCRIPTIONS: Record<string, string> = {
      // Markets
      "Overview": "Get a bird's-eye view of the global markets. Instantly see how stocks, bonds, and currencies are performing right now.",
      "India Cockpit": "Dive deep into the Indian stock market. Track top movers, sector performance, and major indices in real-time.",
      "Sector Comparables": "Compare different industries to spot trends. Find out which sectors are gaining momentum and which are lagging.",
      "Valuation": "Check if the market is currently overvalued or undervalued based on historical data and key financial ratios.",
      "Breadth & Momentum": "Measure the true strength of the market. See how many individual stocks are participating in a rally or sell-off.",
      "Derivatives": "Track options and futures activity. See where the 'smart money' is placing their bets.",
      // Macro
      "Global Board": "Understand the big picture. Track major global economic shifts, inflation trends, and growth metrics.",
      "India Macro": "Focus on India's economy. Access key data like GDP growth, inflation rates, and government fiscal health.",
      "RBI & Liquidity": "Monitor the central bank's moves. See how interest rate changes and liquidity affect the markets.",
      "Currency": "Track the strength of the Rupee against the Dollar and other major global currencies.",
      "Commodities": "Keep an eye on raw materials. Track live prices for Crude Oil, Gold, and industrial metals.",
      "Economic Calendar": "Never miss an important event. See a schedule of upcoming economic announcements that could move the markets.",
      // Portfolio
      "Command Center": "Your personal dashboard. View your total portfolio value, track daily profits or losses, and see all your live investments in one place.",
      "Allocation": "See exactly where your money is. Visualize how your investments are spread across different assets and sectors.",
      "Risk & VaR": "Understand your exposure. We calculate the maximum potential loss your portfolio might face in extreme conditions.",
      "Attribution": "Find out what's working. See exactly which specific stock picks or sector bets are driving your returns.",
      "Quant & Factors": "Advanced analysis. See how much of your performance is driven by market factors like 'Growth', 'Value', or 'Momentum'.",
      "Optimizer": "Let math improve your returns. Get smart suggestions on how to rebalance your investments for the best risk-to-reward ratio.",
      // Research
      "Company Workbench": "Research any specific stock. Get instant access to financial snapshots, historical performance, and competitor analysis.",
      "AI Desk": "Your personal AI analyst. Have a conversation with AI agents to discover new trading ideas and debate stock fundamentals.",
      "IPO Pipeline": "Stay ahead of new listings. Track upcoming Initial Public Offerings and see their subscription status.",
      "Options Flow": "Spot unusual activity. Our AI highlights large, out-of-the-ordinary options trades that might signal a big move.",
      "Research Reports": "Read in-depth analysis. Access detailed, model-driven reports on companies covered by our research team.",
      // Intelligence
      "Intelligence Feed": "Cut through the noise. Our AI reads the latest news and scores it, instantly telling you if a headline is positive or negative for the market.",
      "System & Data": "Transparency is key. Check the live health and freshness of all the data feeds powering our platform.",
      "Data Feeds": "See exactly where we get our numbers. View the complete list of trusted market data providers we connect with.",
      "Daily Brief": "A quick, 5-minute read summarizing the day's main market story, curated by our experts."
    };

    NAV_COLUMNS.forEach((col, index) => {
      // Step for the main column heading
      steps.push({
        element: `#nav-${col.title.toLowerCase()}`,
        popover: {
          title: col.title,
          description: `Let's explore the tools and features available under ${col.title}.`,
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
        const customDesc = TOUR_DESCRIPTIONS[item.label] || item.desc;
        
        steps.push({
          element: `#${id}`,
          popover: {
            title: item.label,
            description: customDesc,
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
