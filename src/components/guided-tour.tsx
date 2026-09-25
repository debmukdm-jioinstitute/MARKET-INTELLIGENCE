import { useEffect, useState } from "react";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { AnimatePresence, motion } from "framer-motion";
import { X, Play } from "lucide-react";
import { NAV_COLUMNS, slug } from "@/lib/nav-columns";

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
      "Overview": "Get a comprehensive bird's-eye view of the global markets. This page aggregates live data across equities, bonds, and currencies so you can instantly gauge the overall market sentiment before diving into specifics.",
      "India Cockpit": "Your command center for the Indian stock market. Track top movers, monitor sector performance, and analyze major indices like the Nifty and Sensex in real-time to spot domestic trading opportunities.",
      "Sector Comparables": "Compare different industries side-by-side to spot emerging trends. Find out which sectors are gaining momentum, which are lagging, and discover where the capital is rotating today.",
      "Valuation": "Evaluate if the market is currently overvalued or undervalued. We provide historical context and key financial ratios (like P/E and P/B bands) so you can make informed decisions about market pricing.",
      "Breadth & Momentum": "Measure the true underlying strength of the market. Instead of just looking at the index price, see exactly how many individual stocks are actually participating in a rally or driving a sell-off.",
      "Derivatives": "Track options and futures activity to anticipate market movements. See where the 'smart money' is placing their bets, monitor open interest, and understand institutional positioning.",
      
      // Macro
      "Global Board": "Understand the big picture driving the markets. Track major global economic shifts, monitor inflation trends across countries, and analyze growth metrics that dictate central bank policies.",
      "India Macro": "Focus specifically on the health of India's economy. Access key localized data such as GDP growth prints, inflation rates, and the government's fiscal health all on one unified dashboard.",
      "RBI & Liquidity": "Monitor the Reserve Bank of India's policy moves. Understand how changes in interest rates, repo paths, and systemic banking liquidity will ultimately impact stock prices and borrowing costs.",
      "Currency": "Track the strength of the Indian Rupee against the US Dollar and other major global currencies. Crucial for understanding export/import dynamics and foreign institutional flows.",
      "Commodities": "Keep an eye on the raw materials that drive the global economy. Track live prices and trends for Crude Oil, Gold, and industrial metals to anticipate inflation and sector-specific impacts.",
      "Economic Calendar": "Never get caught off-guard by a sudden market move. Use this schedule of upcoming major economic announcements (like jobs reports or rate decisions) to prepare your portfolio in advance.",
      
      // Portfolio
      "Command Center": "Your personal investment dashboard. View your total portfolio value, track your daily profit and loss, and manage all your live positions across different brokers in one unified view.",
      "Allocation": "See exactly where your money is deployed. Visualize how your investments are spread across different asset classes, sectors, and geographies to ensure you remain properly diversified.",
      "Risk & VaR": "Understand your true exposure and prepare for the worst. We calculate the maximum potential loss (Value-at-Risk) your portfolio might face during extreme market conditions so you can size positions safely.",
      "Attribution": "Find out exactly what's working and what isn't. Our attribution models break down your performance so you know which specific stock picks or sector bets are actually driving your returns.",
      "Quant & Factors": "Advanced systematic analysis of your holdings. Discover how much of your portfolio's performance is driven by underlying market factors like 'Growth', 'Value', or 'Momentum' rather than individual stock picking.",
      "Optimizer": "Let mathematics improve your returns. Input your constraints and get smart, algorithmic suggestions on how to rebalance your investments for the absolute best risk-to-reward ratio.",
      
      // Research
      "Company Workbench": "The ultimate tool for researching any specific stock. Get instant access to comprehensive financial snapshots, historical performance charts, and direct competitor analysis to build your investment thesis.",
      "AI Desk": "Your personal, intelligent AI analyst. Have a natural conversation with specialized AI agents to discover new trading ideas, debate stock fundamentals, and get unbiased second opinions on your trades.",
      "IPO Pipeline": "Stay ahead of the curve on new market listings. Track upcoming Initial Public Offerings, read their prospectuses, and monitor live subscription statuses to find early opportunities.",
      "Options Flow": "Spot unusual activity before the crowd does. Our AI monitors the entire options tape to highlight large, out-of-the-ordinary trades that might signal an upcoming big move in a stock.",
      "Research Reports": "Read in-depth, professional analysis. Access detailed, model-driven reports and notes on companies covered by our research team to save hours of manual fundamental analysis.",
      
      // Intelligence
      "Intelligence Feed": "Cut through the noise of traditional news. Our AI reads thousands of articles and scores them in real-time, instantly telling you if a breaking headline is positive or negative for your portfolio.",
      "System & Data": "Transparency is critical for trust. Check the live health, latency, and freshness of all the underlying data feeds that power the Market Intelligence platform.",
      "Data Feeds": "See exactly where we get our numbers. View the complete list of trusted, institutional-grade market data providers we connect with to ensure you are trading on the best information.",
      "Daily Brief": "A quick, expertly curated 5-minute read summarizing the day's main market story. Perfect for catching up on the broader narrative without getting bogged down in the data."
    };

    NAV_COLUMNS.forEach((col, index) => {
      // Step for the main column heading
      steps.push({
        element: `#nav-${slug(col.title)}`,
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
        const id = `nav-item-${slug(col.title)}-${slug(item.label)}`;
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
