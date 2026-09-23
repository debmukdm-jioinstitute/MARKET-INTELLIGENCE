"use client";

import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";

// ----------------------------------------------------------------------
// DATA
// ----------------------------------------------------------------------

const AGENTS = {
  fundamental: {
    title: "Fundamental Analyst",
    label: "BEARISH",
    labelColor: "text-red-600 bg-red-50 border-red-100",
    glowColor: "from-red-500/5",
    confidence: "68%",
    points: [
      "P/E (31.43x) exceeds sector avg (27.17x)",
      "P/B (4.3x) above sector (3.48x)",
      "ROA, ROE, ROCE all lag sector benchmarks",
      "Quick ratio (1.35x) below sector (2.01x)",
      "EV/EBITDA (17.82x) higher than sector (14.98x)",
    ],
  },
  sentiment: {
    title: "Sentiment Analyst",
    label: "BULLISH",
    labelColor: "text-emerald-600 bg-emerald-50 border-emerald-100",
    glowColor: "from-emerald-500/5",
    confidence: "85%",
    points: [
      "Adani Ports jumped 5% on Sep 18",
      "Adani Group stocks rallied per Jefferies",
      "Growth drivers flagged for Adani Ports",
    ],
  },
  technical: {
    title: "Technical Analyst",
    label: "NEUTRAL",
    labelColor: "text-gray-500 bg-gray-100 border-gray-200",
    glowColor: "from-gray-500/5",
    confidence: "60%",
    points: [
      "SMA20 (1721.83) is slightly below SMA50 (1728.51) indicating short-term weakness",
      "RSI14 at 57 suggests moderate momentum without overbought pressure",
      "Price is near the high end of its 52-week range (0.85) and recent returns are modest",
    ],
  },
  bull: {
    title: "Bull Researcher",
    label: "",
    labelColor: "",
    glowColor: "from-emerald-500/5",
    confidence: "",
    paragraph:
      "Despite valuation metrics that sit above sector averages, the recent price momentum and strong group-wide rally provide a compelling short-term upside narrative for Adani Ports, while its position near the top of the 52-week range suggests limited downside risk. The bullish sentiment and growth drivers highlighted by analysts create a favorable backdrop for investors seeking exposure to the logistics sector.",
    points: [
      "P/E and EV/EBITDA exceed sector norms, but the stock has already rallied 5% on recent news, indicating positive market sentiment",
      "RSI at 57 and price near the high end of its 52-week range point to moderate momentum without overbought pressure",
      "Group-wide rally and growth catalysts cited by sentiment analysts support a bullish outlook despite weaker fundamentals",
    ],
  },
  bear: {
    title: "Bear Researcher",
    label: "",
    labelColor: "",
    glowColor: "from-red-500/5",
    confidence: "",
    paragraph:
      "The stock appears overvalued relative to its peers and exhibits weaker fundamentals, suggesting limited upside potential. Combined with modest technical signals and a price already near its 52-week high, the risk-reward profile leans against a purchase at current levels.",
    points: [
      "P/E (31.43x) and EV/EBITDA (17.82x) exceed sector averages, indicating overvaluation",
      "ROA, ROE and ROCE lag sector benchmarks, reflecting weaker profitability",
      "Quick ratio (1.35x) is well below the sector norm of 2.01x, raising liquidity concerns",
      "SMA20 below SMA50 points to short-term weakness despite recent price gains",
      "Price is already near the top of its 52-week range, limiting further upside",
    ],
  },
  trader: {
    title: "Trader",
    label: "BUY",
    labelColor: "text-emerald-600 bg-emerald-50 border-emerald-100",
    glowColor: "from-emerald-500/5",
    confidence: "62%",
    subtitle: "illustrative size 3.0%",
    paragraph:
      "While fundamentals are lagging peers, strong short-term momentum and group-wide rally suggest upside potential near the 52-week high, making a modest exposure attractive.",
    points: [],
  },
};

// ----------------------------------------------------------------------
// TYPING HOOK
// ----------------------------------------------------------------------

function useTypingEffect(
  textLines: string[],
  startDelay: number,
  typingSpeed: number = 8
) {
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const startTyping = () => {
      setHasStarted(true);
      setIsTyping(true);
      
      let currentLineIndex = 0;
      let currentCharIndex = 0;
      const newDisplayedLines = textLines.map(() => "");
      setDisplayedLines([...newDisplayedLines]);

      const typeChar = () => {
        if (currentLineIndex < textLines.length) {
          const currentLineText = textLines[currentLineIndex];
          if (currentCharIndex < currentLineText.length) {
            newDisplayedLines[currentLineIndex] = currentLineText.slice(0, currentCharIndex + 1);
            setDisplayedLines([...newDisplayedLines]);
            currentCharIndex++;
            timeoutId = setTimeout(typeChar, typingSpeed + (Math.random() * 10)); // Variable speed
          } else {
            // Move to next line
            currentLineIndex++;
            currentCharIndex = 0;
            timeoutId = setTimeout(typeChar, typingSpeed * 3); // Pause between lines
          }
        } else {
          setIsTyping(false);
          setIsFinished(true);
        }
      };

      typeChar();
    };

    timeoutId = setTimeout(startTyping, startDelay);

    return () => clearTimeout(timeoutId);
  }, [textLines, startDelay, typingSpeed]);

  return { displayedLines, isTyping, isFinished, hasStarted };
}


// ----------------------------------------------------------------------
// AGENT CARD
// ----------------------------------------------------------------------

type Agent = {
  title: string;
  label: string;
  labelColor: string;
  glowColor: string;
  confidence: string;
  points: string[];
  paragraph?: string;
  subtitle?: string;
};

function AgentCard({
  agent,
  delay,
  className,
}: {
  agent: Agent;
  delay: number;
  className?: string;
}) {
  // Combine paragraph and points for the typing effect
  const allLines = [];
  if (agent.paragraph) allLines.push(agent.paragraph);
  if (agent.points && agent.points.length > 0) {
    agent.points.forEach((p) => allLines.push(p));
  }

  const { displayedLines, hasStarted, isTyping } = useTypingEffect(allLines, delay, 15);

  let displayedParagraph = "";
  let displayedPoints: string[] = [];

  if (agent.paragraph) {
    displayedParagraph = displayedLines[0] || "";
    displayedPoints = displayedLines.slice(1);
  } else {
    displayedPoints = displayedLines;
  }

  return (
    <div
      className={cn(
        "ai-agent-card relative overflow-hidden rounded-2xl border border-white/90 bg-white/60 p-5 sm:p-6 shadow-[var(--shadow-sm)] backdrop-blur-xl transition group flex flex-col h-full",
        className
      )}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${agent.glowColor} opacity-0 transition-opacity duration-500 group-hover:opacity-100`} />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-gray-900 tracking-tight">{agent.title}</h4>
          {isTyping && (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
          )}
        </div>
        {agent.label && (
          <span
            className={cn(
              "text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border",
              agent.labelColor
            )}
          >
            {agent.label}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 relative z-10">
        {!hasStarted ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 animate-pulse mt-2">
            <span className="h-1.5 w-1.5 bg-gray-400 rounded-full"></span>
            <span className="h-1.5 w-1.5 bg-gray-400 rounded-full" style={{ animationDelay: '0.2s' }}></span>
            <span className="h-1.5 w-1.5 bg-gray-400 rounded-full" style={{ animationDelay: '0.4s' }}></span>
            <span className="ml-1">Connecting agent...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {agent.paragraph && (
              <p className="text-[13px] leading-relaxed text-gray-700">
                {agent.label === "BUY" && (
                   <span className="text-emerald-600 font-bold uppercase tracking-wider mr-2">{agent.label}</span>
                )}
                {agent.label === "SELL" && (
                   <span className="text-red-600 font-bold uppercase tracking-wider mr-2">{agent.label}</span>
                )}
                {displayedParagraph}
                {isTyping && displayedPoints.length === 0 && <span className="inline-block w-1.5 h-3 bg-blue-500 animate-pulse ml-1 align-middle" />}
              </p>
            )}

            {displayedPoints.length > 0 && (
              <ul className="space-y-2.5 text-[13px] leading-relaxed text-gray-600 list-disc pl-4">
                {displayedPoints.map((point, idx) => {
                  if (!point) return null;
                  const isLastLine = idx === displayedPoints.length - 1;
                  return (
                    <li key={idx} className="marker:text-gray-300">
                      {point}
                      {isTyping && isLastLine && <span className="inline-block w-1.5 h-3 bg-blue-500 animate-pulse ml-1 align-middle" />}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      {agent.confidence && hasStarted && (
        <div className="mt-5 pt-4 border-t border-gray-200/50 flex items-center justify-between relative z-10">
          <p className="text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
             Confidence: <span className="text-gray-600">{agent.confidence}</span>
          </p>
          {agent.subtitle && (
            <p className="text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
              {agent.subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// MAIN COMPONENT
// ----------------------------------------------------------------------

export function LiveDebate() {
  const [inView, setInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Trigger typing when scrolled into view
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect(); // Only trigger once
        }
      },
      { threshold: 0.2 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="space-y-5">
      {/* Top Row: 3 Analysts */}
      <div className="grid gap-5 md:grid-cols-3">
        <AgentCard agent={AGENTS.fundamental} delay={inView ? 500 : 9999999} />
        <AgentCard agent={AGENTS.sentiment} delay={inView ? 1500 : 9999999} />
        <AgentCard agent={AGENTS.technical} delay={inView ? 1000 : 9999999} />
      </div>

      {/* Middle Row: 2 Researchers */}
      <div className="grid gap-5 md:grid-cols-2">
        <AgentCard agent={AGENTS.bull} delay={inView ? 3500 : 9999999} />
        <AgentCard agent={AGENTS.bear} delay={inView ? 4000 : 9999999} />
      </div>

      {/* Bottom Row: Trader */}
      <div className="grid gap-5 grid-cols-1">
        <AgentCard agent={AGENTS.trader} delay={inView ? 7000 : 9999999} />
      </div>
    </div>
  );
}
